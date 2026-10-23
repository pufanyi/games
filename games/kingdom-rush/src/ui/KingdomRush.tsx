// The game component: one canvas the loop draws on every frame, with React
// screens that re-render only when their `View` changes.
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Vec } from "../content/types.ts";
import { drawScene } from "../rendering/render.ts";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../rendering/terrain.ts";
import {
  advance,
  beginLevel,
  build,
  chooseDifficulty,
  createSession,
  interrupt,
  movePointer,
  pressPointer,
  quitToSelect,
  retryLevel,
  sameView,
  sell,
  sendWave,
  type Session,
  setAim,
  setSpeed,
  togglePause,
  upgrade,
  type View,
  viewOf,
} from "../runtime/session.ts";
import { type GameActions, GameScreen } from "./GameScreen.tsx";
import { LevelSelect } from "./LevelSelect.tsx";

export function KingdomRush() {
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current ??= createSession();
  const session = sessionRef.current;
  const [view, setView] = useState<View>(() => viewOf(session));
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const refresh = () => setView(viewOf(session));

  // The game loop: a fixed 30 Hz simulation, drawn every animation frame.
  useEffect(() => {
    if (view.screen !== "game") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // Draw at device resolution so the board stays sharp on high-DPI screens.
    const scale = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = WORLD_WIDTH * scale;
    canvas.height = WORLD_HEIGHT * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    let frameId = 0;
    let last = performance.now();
    let displayed = viewOf(session);
    const frame = (now: number) => {
      advance(session, (now - last) / 1000);
      last = now;
      if (session.world) {
        drawScene(ctx, session.world, {
          hoveredSlotId: session.hoveredSlotId,
          selectedTowerId: session.selectedTowerId,
          buildType: null,
          aiming: session.aim,
          pointer: session.pointer,
        });
      }
      const next = viewOf(session);
      if (!sameView(displayed, next)) {
        displayed = next;
        setView(next);
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [session, view.screen]);

  // Keyboard shortcuts, and pausing when the tab is hidden.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (session.screen !== "game") return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (session.aim) session.aim = null;
        else togglePause(session);
        setView(viewOf(session));
        return;
      }
      if (event.key === "p" || event.key === "P") {
        togglePause(session);
        setView(viewOf(session));
        return;
      }
      if (session.paused || !session.world) return;
      if (event.code === "Space") {
        event.preventDefault();
        sendWave(session);
        setView(viewOf(session));
        return;
      }
      const speed = Number(event.key);
      if (speed >= 1 && speed <= 3) {
        setSpeed(session, speed);
        setView(viewOf(session));
      }
    };
    const onVisibility = () => {
      if (!document.hidden || session.screen !== "game") return;
      interrupt(session);
      setView(viewOf(session));
    };
    addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session]);

  const worldPoint = (event: ReactPointerEvent<HTMLCanvasElement>): Vec => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WORLD_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT,
    };
  };

  const actions: GameActions = {
    build: (type) => {
      build(session, type);
      refresh();
    },
    upgrade: (tier) => {
      upgrade(session, tier);
      refresh();
    },
    sell: () => {
      sell(session);
      refresh();
    },
    aim: (aim) => {
      setAim(session, aim);
      refresh();
    },
    wave: () => {
      sendWave(session);
      refresh();
    },
    speed: (speed) => {
      setSpeed(session, speed);
      refresh();
    },
    pause: () => {
      togglePause(session);
      refresh();
    },
    quit: () => {
      quitToSelect(session);
      refresh();
    },
    retry: () => {
      retryLevel(session);
      refresh();
    },
    next: () => {
      if (view.nextLevel === null) return;
      beginLevel(session, view.nextLevel, "campaign");
      refresh();
    },
  };

  return (
    <div className="kr">
      {view.screen === "select"
        ? (
          <LevelSelect
            view={view}
            onPlay={(levelId, mode) => {
              beginLevel(session, levelId, mode);
              refresh();
            }}
            onDifficulty={(difficulty) => {
              chooseDifficulty(session, difficulty);
              refresh();
            }}
          />
        )
        : (
          <GameScreen
            view={view}
            canvasRef={canvasRef}
            actions={actions}
            onPointerDown={(event) => {
              const point = worldPoint(event);
              movePointer(session, point);
              pressPointer(session, point);
              refresh();
            }}
            onPointerMove={(event) => {
              movePointer(session, worldPoint(event));
            }}
            onPointerLeave={() => movePointer(session, null)}
          />
        )}
    </div>
  );
}
