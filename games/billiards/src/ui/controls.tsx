import type { PointerEvent } from "react";
import { MISCUE_LIMIT } from "../physics/constants.ts";
import { MAX_ELEVATION, type View } from "../runtime/session.ts";

/** Pointer position within an element, from −1 to 1 with y up. */
function within(event: PointerEvent<HTMLElement>): [number, number] {
  const rect = event.currentTarget.getBoundingClientRect();
  return [
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    1 - ((event.clientY - rect.top) / rect.height) * 2,
  ];
}

/** The cue ball seen along the cue: where the tip hits, and the cue angle. */
export function SpinControl({
  view,
  onTip,
  onElevation,
}: {
  view: View;
  onTip: (right: number, up: number) => void;
  onElevation: (degrees: number) => void;
}) {
  const [right, up] = view.tip;
  const set = (event: PointerEvent<HTMLButtonElement>) => {
    const [x, y] = within(event);
    onTip(x, y);
  };
  return (
    <div className="spin">
      <button
        type="button"
        className="spin-ball"
        aria-label={`Spin: ${Math.round(right * 100)}% right, ${
          Math.round(up * 100)
        }% up (W A S D)`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          set(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            set(event);
          }
        }}
        // Give focus back so Space keeps shooting.
        onPointerUp={(event) => event.currentTarget.blur()}
        onDoubleClick={() => onTip(0, 0)}
      >
        <span
          className="spin-limit"
          style={{
            width: `${MISCUE_LIMIT * 100}%`,
            height: `${MISCUE_LIMIT * 100}%`,
          }}
        />
        <span
          className="spin-dot"
          style={{ left: `${50 + right * 50}%`, top: `${50 - up * 50}%` }}
        />
      </button>
      <span className="spin-label">Spin</span>
      <input
        className="elevation"
        type="range"
        min={0}
        max={MAX_ELEVATION}
        step={1}
        value={view.elevation}
        aria-label="Cue elevation"
        onChange={(event) => onElevation(Number(event.currentTarget.value))}
        onPointerUp={(event) => event.currentTarget.blur()}
      />
      <span className="spin-label">Cue {view.elevation}°</span>
    </div>
  );
}

/**
 * Pull down to set the power, let go to shoot. Also shows the power set from
 * the keyboard. Fine-aim buttons sit under it for touch screens.
 */
export function PowerBar({
  view,
  onPower,
  onShoot,
  onCancel,
  onTurn,
}: {
  view: View;
  onPower: (power: number, pulling: boolean) => void;
  onShoot: () => void;
  onCancel: () => void;
  onTurn: (radians: number) => void;
}) {
  const ready = view.phase === "aiming" && !view.paused;
  const set = (event: PointerEvent<HTMLDivElement>) => {
    const [, y] = within(event);
    onPower((1 - y) / 2, true);
  };
  const fine = 0.25 * (Math.PI / 180);
  return (
    <div className="power">
      <span className="power-label">Power</span>
      <div
        className={ready ? "power-bar" : "power-bar disabled"}
        role="slider"
        tabIndex={-1}
        aria-label="Power: pull down and let go to shoot"
        aria-valuenow={Math.round(view.power * 100)}
        onPointerDown={(event) => {
          if (!ready) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          set(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            set(event);
          }
        }}
        onPointerUp={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          event.currentTarget.releasePointerCapture(event.pointerId);
          onShoot();
        }}
        onPointerCancel={onCancel}
      >
        <div
          className="power-fill"
          style={{ height: `${view.power * 100}%` }}
        />
      </div>
      <div className="fine-aim">
        <button
          type="button"
          className="control"
          aria-label="Turn aim left"
          disabled={!ready}
          onClick={() => onTurn(fine)}
        >
          ↺
        </button>
        <button
          type="button"
          className="control"
          aria-label="Turn aim right"
          disabled={!ready}
          onClick={() => onTurn(-fine)}
        >
          ↻
        </button>
      </div>
    </div>
  );
}
