// The browser game component: one canvas owns the animation loop, React owns
// the screens around it and re-renders only when the session view changes.
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { CARD_ORDER } from "../game/catalog.ts";
import { DT, HEIGHT, LEAF, WIDTH } from "../game/config.ts";
import { draw, drawIdle } from "../rendering/draw.ts";
import { unlock } from "../runtime/audio.ts";
import {
  buyCard,
  createSession,
  isPlaying,
  nextLevel,
  openLevels,
  openTitle,
  sameView,
  type Session,
  setPaused,
  startLevel,
  tapLeaf,
  tick,
  toggleMuted,
  type View,
  viewOf,
} from "../runtime/session.ts";
import {
  CardBar,
  GameHud,
  HelpScreen,
  LevelSelectScreen,
  PauseScreen,
  ResultScreen,
  TitleScreen,
} from "./screens.tsx";
import "./style.css";

export function NailHouse() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current ??= createSession();
  const session = sessionRef.current;
  const [view, setView] = useState<View>(() => viewOf(session));
  const [help, setHelp] = useState(false);
  const shown = useRef(view);

  const refresh = () => {
    const next = viewOf(session);
    shown.current = next;
    setView(next);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * scale;
    canvas.height = HEIGHT * scale;
    ctx.scale(scale, scale);

    let frameId = 0;
    let last = performance.now();
    let pending = 0;
    const frame = (now: number) => {
      pending += Math.min((now - last) / 1000, 0.25);
      last = now;
      while (pending >= DT) {
        pending -= DT;
        tick(session);
      }
      const time = now / 1000;
      if (session.screen === "game") {
        draw(ctx, session.game, time);
      } else {
        drawIdle(ctx, session.game, time);
      }
      const next = viewOf(session);
      if (!sameView(shown.current, next)) {
        shown.current = next;
        setView(next);
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [session]);

  const openHelp = () => {
    unlock();
    setHelp(true);
    setPaused(session, true);
    refresh();
  };
  const closeHelp = () => {
    setHelp(false);
    if (session.screen === "game" && session.game.phase === "playing") {
      setPaused(session, false);
    }
    refresh();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key;
      if (help) {
        if (key === "Escape" || key === "Enter") {
          event.preventDefault();
          setHelp(false);
          if (session.screen === "game" && session.game.phase === "playing") {
            setPaused(session, false);
          }
          refresh();
        }
        return;
      }
      if (session.screen === "title") {
        if (key === "Enter" || key === " ") {
          event.preventDefault();
          openLevels(session);
          refresh();
        }
        return;
      }
      if (session.screen === "levels") {
        if (key === "Escape") {
          openTitle(session);
          refresh();
          return;
        }
        const index = Number(key);
        if (Number.isInteger(index) && index >= 1 && index <= 7) {
          startLevel(session, index);
          refresh();
        }
        return;
      }
      if (key === "p" || key === "P" || key === "Escape") {
        event.preventDefault();
        setPaused(session, !session.paused);
        refresh();
        return;
      }
      if (key === "m" || key === "M") {
        toggleMuted(session);
        refresh();
        return;
      }
      if (!isPlaying(session)) return;
      if (key === "h" || key === "H") {
        event.preventDefault();
        tapLeaf(session);
        refresh();
        return;
      }
      const index = Number(key);
      if (Number.isInteger(index) && index >= 1 && index <= 6) {
        buyCard(session, CARD_ORDER[index - 1]);
        refresh();
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        setPaused(session, true);
        refresh();
      }
    };
    addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  });

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    unlock();
    if (!isPlaying(session)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    if (Math.hypot(x - LEAF.x, y - LEAF.y) <= 30) {
      tapLeaf(session);
      refresh();
    }
  };

  const screen = view.screen;
  return (
    <div className="nh-app">
      <div className="nh-stage">
        <canvas
          ref={canvasRef}
          className="nh-canvas"
          width={WIDTH}
          height={HEIGHT}
          onPointerDown={onPointerDown}
          aria-label="Nail House. Defend the house from the demolition crew."
        />

        {screen === "game" && (
          <GameHud
            view={view}
            onPause={() => {
              setPaused(session, !session.paused);
              refresh();
            }}
            onMute={() => {
              toggleMuted(session);
              refresh();
            }}
            onHelp={openHelp}
          />
        )}

        {screen === "game" && view.phase === "playing" && (
          <CardBar
            cards={view.cards}
            onBuy={(type) => {
              buyCard(session, type);
              refresh();
            }}
          />
        )}

        {screen === "title" && (
          <TitleScreen
            unlocked={view.unlocked}
            muted={view.muted}
            onLevels={() => {
              unlock();
              openLevels(session);
              refresh();
            }}
            onHelp={openHelp}
            onMute={() => {
              toggleMuted(session);
              refresh();
            }}
          />
        )}

        {screen === "levels" && (
          <LevelSelectScreen
            unlocked={view.unlocked}
            onPick={(level) => {
              startLevel(session, level);
              refresh();
            }}
            onBack={() => {
              openTitle(session);
              refresh();
            }}
          />
        )}

        {screen === "game" && view.paused && view.phase === "playing" &&
          !help && (
          <PauseScreen
            onResume={() => {
              setPaused(session, false);
              refresh();
            }}
            onRestart={() => {
              startLevel(session, session.game.level);
              refresh();
            }}
            onLevels={() => {
              openLevels(session);
              refresh();
            }}
            onTitle={() => {
              openTitle(session);
              refresh();
            }}
          />
        )}

        {screen === "game" && view.phase !== "playing" && (
          <ResultScreen
            view={view}
            onNext={() => {
              nextLevel(session);
              refresh();
            }}
            onRetry={() => {
              startLevel(session, session.game.level);
              refresh();
            }}
            onLevels={() => {
              openLevels(session);
              refresh();
            }}
          />
        )}

        {help && <HelpScreen onClose={closeHelp} />}
      </div>
    </div>
  );
}
