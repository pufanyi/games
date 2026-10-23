// The game component: a canvas the loop draws on every frame, with React
// overlays that re-render only when their `View` changes.
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { unlock } from "./audio.ts";
import { HEIGHT, WIDTH } from "./layout.ts";
import { BALL_RADIUS as R } from "./physics/constants.ts";
import { Renderer } from "./rendering/renderer.ts";
import {
  BallTray,
  Hud,
  PauseScreen,
  PowerBar,
  ResultScreen,
  SpinControl,
  TitleScreen,
} from "./screens.tsx";
import {
  aimAt,
  createSession,
  isActive,
  moveCue,
  pickUp,
  place,
  quitToTitle,
  sameView,
  type Session,
  setElevation,
  setPaused,
  setPower,
  setPulling,
  setTip,
  shootNow,
  start,
  toggleMuted,
  turnAim,
  update,
  type View,
  viewOf,
} from "./session.ts";

const DEGREE = Math.PI / 180;

export function Billiards() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [cameraView, setCameraView] = useState<"table" | "top">("table");
  const cameraViewRef = useRef<"table" | "top">("table");
  const [renderError, setRenderError] = useState(false);
  const [renderAttempt, setRenderAttempt] = useState(0);

  function switchCamera() {
    const next = cameraViewRef.current === "table" ? "top" : "table";
    cameraViewRef.current = next;
    rendererRef.current?.setView(next);
    setCameraView(next);
  }
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current ??= createSession();
  const session = sessionRef.current;
  const [view, setView] = useState<View>(() => viewOf(session));

  // Runs a session action, then refreshes the overlays right away rather than
  // waiting for the next frame.
  function act(action: (s: Session) => void) {
    return () => {
      action(session);
      setView(viewOf(session));
    };
  }

  // The loop: real time drives the clock and shot playback.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: Renderer;
    try {
      renderer = new Renderer(canvas);
      renderer.setView(cameraViewRef.current);
      rendererRef.current = renderer;
      setRenderError(false);
    } catch {
      setRenderError(true);
      setPaused(session, true);
      return;
    }
    const onLost = (event: Event) => {
      event.preventDefault();
      setPaused(session, true);
      setRenderError(true);
    };
    // Rebuild generated reflection targets after the GPU has lost their contents.
    const onRestored = () => setRenderAttempt((n) => n + 1);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    let frameId = 0;
    let last = performance.now();
    let displayed = viewOf(session);
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      update(session, dt);
      renderer.draw(session, isActive(session) ? dt : 0);
      const next = viewOf(session);
      if (!sameView(displayed, next)) {
        displayed = next;
        setView(next);
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      rendererRef.current = null;
      renderer.dispose();
    };
  }, [session, renderAttempt]);

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
      // Let the elevation slider have its own arrow keys.
      if (event.target instanceof HTMLInputElement) return;
      if (!isActive(session)) return;
      const { game } = session;
      const step = event.shiftKey ? 0.1 : 1;
      if (game.phase === "placing") {
        const cue = game.balls[0];
        const move = 0.01 * step;
        const moves: Record<string, [number, number]> = {
          ArrowLeft: [-move, 0],
          ArrowRight: [move, 0],
          ArrowUp: [0, move],
          ArrowDown: [0, -move],
        };
        if (moves[event.key]) {
          event.preventDefault();
          moveCue(
            session,
            cue.x + moves[event.key][0],
            cue.y + moves[event.key][1],
          );
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          place(session);
        }
        refresh();
        return;
      }
      if (game.phase !== "aiming") return;
      const [right, up] = session.tip;
      switch (event.key) {
        case "ArrowLeft":
          turnAim(session, step * DEGREE);
          break;
        case "ArrowRight":
          turnAim(session, -step * DEGREE);
          break;
        case "ArrowUp":
          setPower(session, session.power + 0.05);
          break;
        case "ArrowDown":
          setPower(session, session.power - 0.05);
          break;
        case " ":
          if (!event.repeat) shootNow(session);
          break;
        case "w":
        case "W":
          setTip(session, right, up + 0.1);
          break;
        case "s":
        case "S":
          setTip(session, right, up - 0.1);
          break;
        case "a":
        case "A":
          setTip(session, right - 0.1, up);
          break;
        case "d":
        case "D":
          setTip(session, right + 0.1, up);
          break;
        case "m":
        case "M":
          pickUp(session);
          break;
        default:
          return;
      }
      event.preventDefault();
      refresh();
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

  /** The pointer's position on the table, in meters. */
  function pointer(
    event: PointerEvent<HTMLCanvasElement>,
  ): [number, number] | null {
    const rect = event.currentTarget.getBoundingClientRect();
    return rendererRef.current?.camera.toTable(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2,
    ) ?? null;
  }

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    unlock();
    if (!isActive(session)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointer(event);
    if (!point) return;
    const [x, y] = point;
    const { game } = session;
    const cue = game.balls[0];
    if (
      game.phase === "aiming" && game.ballInHand &&
      Math.hypot(x - cue.x, y - cue.y) < 2.5 * R
    ) {
      pickUp(session);
    }
    if (game.phase === "placing") moveCue(session, x, y);
    else aimAt(session, x, y);
    setView(viewOf(session));
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isActive(session)) return;
    // A mouse aims just by hovering; touch and pen while pressed.
    const pressed = event.currentTarget.hasPointerCapture(event.pointerId);
    if (!pressed && event.pointerType !== "mouse") return;
    const point = pointer(event);
    if (!point) return;
    const [x, y] = point;
    if (session.game.phase === "placing") moveCue(session, x, y);
    else if (session.game.phase === "aiming") aimAt(session, x, y);
  };

  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    act(place)();
  };

  let screen = null;
  if (view.mode === "title") {
    screen = <TitleScreen view={view} onPlay={act(start)} />;
  } else if (view.phase === "won" || view.phase === "lost") {
    screen = (
      <ResultScreen
        view={view}
        onPlayAgain={act(start)}
        onQuit={act(quitToTitle)}
      />
    );
  } else if (view.paused) {
    screen = (
      <PauseScreen
        onResume={act((s) => setPaused(s, false))}
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
        aria-label="Pool table. Aim with the mouse or arrow keys, shoot with the power bar or Space."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      {view.mode === "game" && (
        <>
          <BallTray potted={view.potted} />
          <Hud
            view={view}
            onPause={act((s) => setPaused(s, !s.paused))}
            onMute={act(toggleMuted)}
          />
          <SpinControl
            view={view}
            onTip={(right, up) => act((s) => setTip(s, right, up))()}
            onElevation={(degrees) => act((s) => setElevation(s, degrees))()}
          />
          <PowerBar
            view={view}
            onPower={(power, pulling) =>
              act((s) => {
                setPower(s, power);
                setPulling(s, pulling);
              })()}
            onShoot={act(shootNow)}
            onCancel={act((s) => setPulling(s, false))}
            onTurn={(radians) => act((s) => turnAim(s, radians))()}
          />
        </>
      )}
      <button
        type="button"
        className="control camera-control"
        onClick={(event) => {
          switchCamera();
          event.currentTarget.blur();
        }}
        aria-label="Switch camera view"
        aria-pressed={cameraView === "top"}
      >
        {cameraView === "top" ? "3D view" : "Top view"}
      </button>
      {screen}
      {renderError && (
        <div className="overlay">
          <div className="panel" role="alert">
            <h2>3D view unavailable</h2>
            <p>
              The game needs browser 3D graphics support. Check hardware
              acceleration, then try again.
            </p>
            <button
              type="button"
              className="button primary"
              onClick={() => setRenderAttempt((n) => n + 1)}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
