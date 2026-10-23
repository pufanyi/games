// The game component: a canvas the loop draws on every frame, with React
// screens on top that re-render only when their `View` changes.
import { useEffect, useRef, useState } from "react";
import { unlock } from "./audio.ts";
import { HEIGHT, WIDTH } from "./level.ts";
import { draw } from "./render.ts";
import {
  Controls,
  GameOverScreen,
  PauseScreen,
  ShopScreen,
  TitleScreen,
} from "./screens.tsx";
import {
  createSession,
  isPlaying,
  queue,
  quitToTitle,
  sameView,
  type Session,
  setPaused,
  start,
  tick,
  toggleMuted,
  type View,
  viewOf,
} from "./session.ts";
import { DT, type ShopItem } from "./sim.ts";

export function GoldMiner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current ??= createSession();
  const session = sessionRef.current;
  const [view, setView] = useState<View>(() => viewOf(session));

  // Runs a session action, then refreshes the screens right away rather than
  // waiting for the next frame.
  function act(action: (s: Session) => void) {
    return () => {
      action(session);
      setView(viewOf(session));
    };
  }

  // The game loop: fixed-timestep simulation, drawn every animation frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // Draw at device resolution so the canvas stays sharp on high-DPI screens.
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
      draw(ctx, session.game);
      const next = viewOf(session);
      setView((current) => (sameView(current, next) ? current : next));
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [session]);

  // Keyboard, and pausing when the tab is hidden.
  useEffect(() => {
    const refresh = () => setView(viewOf(session));
    const onKey = (event: KeyboardEvent) => {
      if (session.mode === "title") {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          start(session);
          refresh();
        }
        return;
      }
      if (event.key === "p" || event.key === "P" || event.key === "Escape") {
        setPaused(session, !session.paused);
        refresh();
        return;
      }
      if (!isPlaying(session)) return;
      if (event.key === "ArrowDown" || event.key === " ") {
        event.preventDefault();
        if (!event.repeat) queue(session, { player: 0, action: "fire" });
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        queue(session, { player: 0, action: "dynamite" });
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
  }, [session]);

  const onPointerDown = () => {
    unlock();
    if (isPlaying(session)) queue(session, { player: 0, action: "fire" });
  };
  const buy = (item: ShopItem) =>
    act((s) => queue(s, { player: 0, action: "buy", item }))();

  let screen = null;
  if (view.mode === "title") {
    screen = <TitleScreen view={view} onPlay={act(start)} />;
  } else if (view.paused) {
    screen = (
      <PauseScreen
        onResume={act((s) => setPaused(s, false))}
        onQuit={act(quitToTitle)}
      />
    );
  } else if (view.phase === "shop") {
    screen = (
      <ShopScreen
        view={view}
        onBuy={buy}
        onContinue={act((s) => queue(s, { player: 0, action: "continue" }))}
      />
    );
  } else if (view.phase === "gameOver") {
    screen = (
      <GameOverScreen
        view={view}
        onPlayAgain={act(start)}
        onQuit={act(quitToTitle)}
      />
    );
  }

  return (
    <div className="stage">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        aria-label="Gold Miner. Press Down or Space to fire the claw."
        onPointerDown={onPointerDown}
      />
      {view.mode === "game" && (
        <Controls
          view={view}
          onDynamite={act((s) => queue(s, { player: 0, action: "dynamite" }))}
          onPause={act((s) => setPaused(s, !s.paused))}
          onMute={act(toggleMuted)}
        />
      )}
      {screen}
    </div>
  );
}
