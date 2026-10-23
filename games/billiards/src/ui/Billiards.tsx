// Composes the table, pointer interaction, and React overlays. The renderer
// hook owns frame updates; the browser runtime owns keyboard bindings.
import {
  type PointerEvent,
  useEffect,
  useRef,
  useState,
  type WheelEvent,
} from "react";
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
  toggleGuide,
  toggleMuted,
  turnAim,
  type View,
  viewOf,
} from "../runtime/session.ts";

/** A press on the table in the cue view: a drag turns, holding still charges. */
interface Drag {
  x: number;
  y: number;
  turning: boolean;
}

/** Past this many pixels a press is a drag, not a charge. */
const DRAG_THRESHOLD = 6;
/** Radians of aim for a drag across the whole table view. */
const TURN_PER_WIDTH = Math.PI * 0.6;
const TILT_PER_HEIGHT = 1.2;

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
  const dragRef = useRef<Drag | null>(null);

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
    if (
      !isActive(session) || session.charge || event.button !== 0 ||
      !event.isPrimary
    ) return;
    const point = pointer(event);
    const { game } = session;
    if (cameraView === "cue" && game.phase === "aiming") {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = { x: event.clientX, y: event.clientY, turning: false };
      // Touch only drags here; its separate Hold button avoids accidental shots.
      if (event.pointerType === "mouse") beginCharge(session, "table");
      setView(viewOf(session));
      return;
    }
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const [x, y] = point;
    const cue = game.balls[0];
    if (
      game.phase === "aiming" && game.ballInHand &&
      Math.hypot(x - cue.x, y - cue.y) < 2.5 * R
    ) {
      pickUp(session);
    }
    if (game.phase === "placing") {
      moveCue(session, x, y);
    } else if (game.phase === "aiming") {
      aimAt(session, x, y);
      if (event.pointerType === "mouse") beginCharge(session, "table");
    }
    setView(viewOf(session));
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isActive(session)) return;
    // A mouse aims just by hovering; touch and pen while pressed.
    const pressed = event.currentTarget.hasPointerCapture(event.pointerId);
    const drag = dragRef.current;
    if (drag && pressed) {
      if (session.game.phase !== "aiming") return;
      const rect = event.currentTarget.getBoundingClientRect();
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.turning && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!drag.turning) {
        drag.turning = true;
        cancelTableCharge();
      }
      // Turn by the movement since the last event, so Shift can switch to
      // fine aim mid-drag.
      const fine = event.shiftKey ? 0.15 : 1;
      turnAim(session, -dx / rect.width * TURN_PER_WIDTH * fine);
      rendererRef.current?.camera.tilt(dy / rect.height * TILT_PER_HEIGHT);
      drag.x = event.clientX;
      drag.y = event.clientY;
      return;
    }
    if (!pressed && event.pointerType !== "mouse") return;
    const point = pointer(event);
    if (!point) return;
    const [x, y] = point;
    if (session.game.phase === "placing") moveCue(session, x, y);
    else if (session.game.phase === "aiming" && cameraView === "top") {
      aimAt(session, x, y);
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    dragRef.current = null;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      cancelTableCharge();
      return;
    }
    if (session.game.phase === "placing") place(session);
    else releaseCharge(session, "table");
    event.currentTarget.releasePointerCapture(event.pointerId);
    setView(viewOf(session));
  };

  const onWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    if (cameraView === "cue") {
      rendererRef.current?.camera.zoom(Math.exp(event.deltaY * 0.001));
    }
  };

  const cancelTableCharge = () => {
    if (session.charge === "table") act(cancelCharge)();
  };

  const onLostCapture = () => {
    dragRef.current = null;
    cancelTableCharge();
  };

  let screen = null;
  if (view.mode === "title") {
    screen = (
      <TitleScreen
        view={view}
        onPlay={act(start)}
        onGuide={act(toggleGuide)}
      />
    );
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
        className={cameraView === "cue" ? "cue-view" : undefined}
        width={WIDTH}
        height={HEIGHT}
        aria-label="Pool table. Drag or use the arrow keys to aim, hold the left mouse button or Space to charge and release to shoot, or press Enter for the set strength."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onLostCapture}
        onLostPointerCapture={onLostCapture}
        onWheel={onWheel}
      />
      {view.mode === "game" && (
        <>
          <BallTray potted={view.potted} />
          <Hud
            view={view}
            camera={cameraView}
            onPause={act((s) => setPaused(s, !s.paused))}
            onMute={act(toggleMuted)}
            onGuide={act(toggleGuide)}
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
        {cameraView === "top" ? "Cue view" : "Top view"}
      </button>
      {view.mode === "game" && view.phase === "aiming" && view.ballInHand &&
        !view.paused && (
        <button
          type="button"
          className="control move-control"
          disabled={view.charging}
          onClick={(event) => {
            act(pickUp)();
            event.currentTarget.blur();
          }}
        >
          Move cue ball
        </button>
      )}
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
