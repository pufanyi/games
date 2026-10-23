// Everything over the canvas: the title, pause and result screens, the HUD,
// and the spin, elevation and power controls. They render from a `View` and
// report actions upward.
import {
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { ballColor } from "./rendering/colors.ts";
import { MISCUE_LIMIT } from "./physics/constants.ts";
import { FOUL_PENALTY, TIME_LIMIT } from "./rules/timed.ts";
import { MAX_ELEVATION, type View } from "./session.ts";

/** 83 → "1:23". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function bestText(view: View) {
  const { best } = view;
  return best
    ? `Best: cleared with ${clock(best.timeLeft)} left, in ${best.shots} shots`
    : null;
}

/**
 * A screen over the canvas. Like a modal dialog, it moves focus to its main
 * (`.primary`) button when it opens, so Enter or Space picks it.
 */
function Panel({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>(".primary")?.focus();
  }, []);
  return (
    <div className="overlay">
      <div
        ref={ref}
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}

export function TitleScreen(
  { view, onPlay }: { view: View; onPlay: () => void },
) {
  const best = bestText(view);
  return (
    <Panel label="Billiards">
      <h1>Billiards</h1>
      <p className="tagline">
        Pot all 15 balls in any order before the {clock(TIME_LIMIT)}{" "}
        clock runs out. Scratching or missing every ball costs {FOUL_PENALTY}
        {" "}
        seconds.
      </p>
      <p className="keys">
        Aim with the mouse or a finger, then drag the power bar down and let go.
        Or <kbd>←</kbd> <kbd>→</kbd> aim, <kbd>↑</kbd> <kbd>↓</kbd> power,{" "}
        <kbd>Space</kbd> shoot, <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd>{" "}
        <kbd>D</kbd> spin.
      </p>
      {best && <p className="muted">{best}</p>}
      <button type="button" className="button primary" onClick={onPlay}>
        Play
      </button>
    </Panel>
  );
}

export function PauseScreen(
  { onResume, onQuit }: { onResume: () => void; onQuit: () => void },
) {
  return (
    <Panel label="Paused">
      <h2>Paused</h2>
      <button type="button" className="button primary" onClick={onResume}>
        Resume
      </button>
      <button type="button" className="button" onClick={onQuit}>
        Quit to title
      </button>
    </Panel>
  );
}

export function ResultScreen({
  view,
  onPlayAgain,
  onQuit,
}: {
  view: View;
  onPlayAgain: () => void;
  onQuit: () => void;
}) {
  const won = view.phase === "won";
  const best = bestText(view);
  const fouls = view.fouls === 1 ? "1 foul" : `${view.fouls} fouls`;
  return (
    <Panel label={won ? "Table cleared" : "Time's up"}>
      <h2>{won ? "Table cleared!" : "Time's up"}</h2>
      <p>
        {won
          ? `${
            clock(view.seconds)
          } left on the clock, in ${view.shots} shots ` +
            `with ${fouls}.`
          : `${view.ballsLeft} ${
            view.ballsLeft === 1 ? "ball" : "balls"
          } left on the table after ${view.shots} shots.`}
      </p>
      {won && view.newBest
        ? <p className="highlight">New best!</p>
        : best && <p className="muted">{best}</p>}
      <button type="button" className="button primary" onClick={onPlayAgain}>
        Play again
      </button>
      <button type="button" className="button" onClick={onQuit}>
        Quit to title
      </button>
    </Panel>
  );
}

/** What to do next, shown under the clock. */
function hint(view: View): string {
  if (view.phase === "placing") {
    return view.area === "kitchen"
      ? "Place the cue ball behind the line"
      : "Ball in hand: place the cue ball";
  }
  if (view.phase === "rolling") return "";
  if (view.ballInHand) return "Aim, or drag the cue ball";
  return "Aim, then pull the power bar";
}

const FOUL_TEXT = {
  scratch: "Scratch",
  miss: "No ball hit",
} as const;

/**
 * The bar across the top. Its buttons give up focus after a click so Space
 * keeps shooting instead of pressing the button again.
 */
export function Hud({
  view,
  onPause,
  onMute,
}: {
  view: View;
  onPause: () => void;
  onMute: () => void;
}) {
  const press =
    (action: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
      action();
      event.currentTarget.blur();
    };
  const over = view.phase === "won" || view.phase === "lost";
  return (
    <div className="hud">
      <div className="hud-left">
        <span
          className={view.seconds <= 30 ? "clock low" : "clock"}
          role="timer"
          aria-label={`${clock(view.seconds)} left`}
        >
          {clock(view.seconds)}
        </span>
        <span className="status">
          {view.foul && view.phase === "placing"
            ? (
              <span className="foul">
                {FOUL_TEXT[view.foul]}! −{FOUL_PENALTY}s
              </span>
            )
            : `${view.ballsLeft} left · ${view.shots} ${
              view.shots === 1 ? "shot" : "shots"
            }`}
          <span className="hint">{hint(view)}</span>
        </span>
      </div>
      <div className="hud-right">
        <button
          type="button"
          className="control"
          disabled={over}
          onClick={press(onPause)}
        >
          {view.paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          className="control"
          aria-pressed={view.muted}
          onClick={press(onMute)}
        >
          {view.muted ? "Sound off" : "Sound on"}
        </button>
      </div>
    </div>
  );
}

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

/** DOM status stays sharp and accessible independently of the camera. */
export function BallTray({ potted }: { potted: number[] }) {
  return (
    <div
      className="ball-tray"
      role="img"
      aria-label={`Potted balls: ${potted.join(", ") || "none"}`}
    >
      {Array.from({ length: 15 }, (_, i) => i + 1).map((id) => (
        <span
          key={id}
          role="img"
          className={`tray-ball${potted.includes(id) ? " potted" : ""}${
            id > 8 ? " striped" : ""
          }`}
          style={{ backgroundColor: ballColor(id) }}
          aria-label={`Ball ${id}: ${
            potted.includes(id) ? "potted" : "on table"
          }`}
        >
          <span>{id}</span>
        </span>
      ))}
    </div>
  );
}
