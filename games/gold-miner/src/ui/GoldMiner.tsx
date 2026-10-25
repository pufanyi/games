import {
  clearInvitation,
  invitation,
  mySeat,
  OnlineSession,
  type OnlineView,
} from "../runtime/online.ts";
import { Notice, partnerStatus, RoomScreen } from "./OnlineScreen.tsx";
// The game component: a canvas the loop draws on every frame, with React
// screens on top that re-render only when their `View` changes.
import { useEffect, useRef, useState } from "react";
import { unlock } from "../runtime/audio.ts";
import { HEIGHT, WIDTH } from "../game/config.ts";
import { draw, type NameTag } from "../rendering/render.ts";
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
} from "../runtime/session.ts";
import { DT } from "../game/config.ts";
import type { ShopItem } from "../game/shop.ts";

export function GoldMiner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current ??= createSession();
  const session = sessionRef.current;
  const [view, setView] = useState<View>(() => viewOf(session));

  useEffect(() => {
    const room = invitation();
    if (room !== null) new OnlineSession(session, "guest", room);
    return () => session.online?.leave();
  }, [session]);

  const leave = () => {
    quitToTitle(session);
    clearInvitation();
  };

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
    let displayed = viewOf(session);
    const frame = (now: number) => {
      pending += Math.min((now - last) / 1000, 0.25);
      last = now;
      while (pending >= DT) {
        pending -= DT;
        tick(session);
      }
      const online = session.online;
      draw(
        ctx,
        online?.render() ?? session.game,
        online ? nameTags(online.view) : undefined,
      );
      const next = viewOf(session);
      if (!sameView(displayed, next)) {
        displayed = next;
        setView(next);
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [session]);

  // Keyboard, and pausing when the tab is hidden.
  useEffect(() => {
    const refresh = () => setView(viewOf(session));
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("button, input, textarea, select, a")
      ) return;
      if (session.mode === "title") {
        if (session.online) return;
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
  if (
    view.online &&
    (view.online.lobby || view.online.status === "closed")
  ) {
    screen = (
      <RoomScreen
        online={view.online}
        onStart={act(start)}
        onRename={(name) => act((s) => s.online?.rename(name))()}
        onLeave={act(leave)}
      />
    );
  } else if (view.mode === "title") {
    screen = (
      <TitleScreen
        view={view}
        onPlay={act(start)}
        onOnline={act((s) => {
          new OnlineSession(s, "host");
        })}
      />
    );
  } else if (view.paused) {
    screen = (
      <PauseScreen
        online={view.online}
        status={view.online && partnerStatus(view.online)}
        onResume={act((s) => setPaused(s, false))}
        onQuit={act(leave)}
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
        onQuit={act(leave)}
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
      {view.online && <Notice online={view.online} />}
    </div>
  );
}

/** "You" over your own miner, your friend's name over theirs once known. */
function nameTags(online: OnlineView): (NameTag | null)[] {
  const seat = mySeat(online);
  return online.players.map((name, i) => {
    if (i === seat) return { text: "You", own: true };
    const text = name ?? online.partner;
    return text ? { text, own: false } : null;
  });
}
