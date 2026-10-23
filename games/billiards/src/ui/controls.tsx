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
  onCharge,
  onRelease,
  onTurn,
}: {
  view: View;
  onPower: (power: number, pulling: boolean) => void;
  onShoot: () => void;
  onCancel: () => void;
  onCharge: () => void;
  onRelease: () => void;
  onTurn: (radians: number) => void;
}) {
  const ready = view.phase === "aiming" && !view.paused;
  const set = (event: PointerEvent<HTMLDivElement>) => {
    const [, y] = within(event);
    onPower((1 - y) / 2, true);
  };
  const adjustable = ready && !view.charging;
  const percent = Math.round(view.power * 100);
  const fine = 0.25 * (Math.PI / 180);
  return (
    <div className="power">
      <span className="power-label">Strength</span>
      <span className="strength-value">{percent}%</span>
      <div
        className={ready ? "power-bar" : "power-bar disabled"}
        role="slider"
        tabIndex={adjustable ? 0 : -1}
        aria-label="Strength: drag and release to shoot"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-disabled={!adjustable}
        aria-orientation="vertical"
        aria-valuenow={percent}
        onKeyDown={(event) => {
          if (!adjustable) return;
          const change = event.key === "ArrowUp"
            ? 0.05
            : event.key === "ArrowDown"
            ? -0.05
            : 0;
          if (change) {
            event.preventDefault();
            event.stopPropagation();
            onPower(view.power + change, false);
          }
        }}
        onPointerDown={(event) => {
          if (!adjustable || event.button !== 0) return;
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
        onLostPointerCapture={onCancel}
      >
        <div
          className="power-fill"
          style={{ height: `${view.power * 100}%` }}
        />
      </div>
      <button
        type="button"
        className="control charge-button"
        disabled={!ready}
        aria-label="Hold to charge, release to shoot"
        onPointerDown={(event) => {
          if (event.button !== 0 || view.charging) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          onCharge();
        }}
        onPointerUp={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          onRelease();
          event.currentTarget.releasePointerCapture(event.pointerId);
          event.currentTarget.blur();
        }}
        onPointerCancel={onCancel}
        onLostPointerCapture={onCancel}
        onBlur={onCancel}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key !== " " && event.key !== "Enter") return;
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat) onCharge();
        }}
        onKeyUp={(event) => {
          if (event.key !== " " && event.key !== "Enter") return;
          event.preventDefault();
          event.stopPropagation();
          onRelease();
        }}
      >
        {view.charging ? "Release" : "Hold"}
      </button>
      <span className="charge-hint">
        {view.charging && percent === 100 ? "MAX" : "Space"}
      </span>
      <div className="fine-aim">
        <button
          type="button"
          className="control"
          aria-label="Turn aim left"
          disabled={!adjustable}
          onClick={() => onTurn(fine)}
        >
          ↺
        </button>
        <button
          type="button"
          className="control"
          aria-label="Turn aim right"
          disabled={!adjustable}
          onClick={() => onTurn(-fine)}
        >
          ↻
        </button>
      </div>
    </div>
  );
}
