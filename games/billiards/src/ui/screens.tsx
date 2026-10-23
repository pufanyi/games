// Everything over the canvas: the title, pause and result screens, the HUD,
// and the potted-ball tray. They render from a `View` and report actions upward.
import { type MouseEvent, type ReactNode, useEffect, useRef } from "react";
import { ballColor } from "../rendering/colors.ts";
import { FOUL_PENALTY, TIME_LIMIT } from "../rules/timed.ts";
import type { View } from "../runtime/session.ts";

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
        Aim with the mouse or a finger. Hold Space or Hold to charge; release to
        shoot. Drag the strength bar for precise shots. Or <kbd>←</kbd>{" "}
        <kbd>→</kbd> aim, <kbd>↑</kbd> <kbd>↓</kbd> strength, <kbd>Enter</kbd>
        {" "}
        shoot at set strength, <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd>{" "}
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
  if (view.charging) return "Release to shoot · Esc to cancel";
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
