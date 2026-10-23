// Composes the table, pointer interaction, and React overlays. The renderer
// hook owns frame updates; the browser runtime owns keyboard bindings.
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { unlock } from "../runtime/audio.ts";
import { HEIGHT, WIDTH } from "../rendering/layout.ts";
import { BALL_RADIUS as R } from "../physics/constants.ts";
import { bindKeyboard } from "../runtime/keyboard.ts";
import { PowerBar, SpinControl } from "./controls.tsx";
import { useTableRenderer } from "./useTableRenderer.ts";
import {
  BallTray,
  Hud,
  PauseScreen,
  ResultScreen,
  TitleScreen,
} from "./screens.tsx";
import {
  aimAt,
  beginCharge,
  cancelCharge,
  createSession,
  isActive,
  moveCue,
  pickUp,
  place,
  quitToTitle,
  releaseCharge,
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
  type View,
  viewOf,
} from "../runtime/session.ts";

export function Billiards() {
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current ??= createSession();
  const session = sessionRef.current;
  const [view, setView] = useState<View>(() => viewOf(session));
  const {
    canvasRef,
    rendererRef,
    cameraView,
    switchCamera,
    renderError,
    retryRendering,
  } = useTableRenderer(session, setView);

  // Runs a session action, then refreshes the overlays right away rather than
  // waiting for the next frame.
  function act(action: (s: Session) => void) {
    return () => {
      action(session);
      setView(viewOf(session));
    };
  }

  useEffect(() => bindKeyboard(session, () => setView(viewOf(session))), [
    session,
  ]);

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
        aria-label="Pool table. Aim with the mouse or arrow keys, hold Space to charge and release to shoot, or press Enter for the set strength."
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
            onCancel={act(cancelCharge)}
            onCharge={act((s) => beginCharge(s, "pointer"))}
            onRelease={act((s) => releaseCharge(s, "pointer"))}
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
              onClick={retryRendering}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
