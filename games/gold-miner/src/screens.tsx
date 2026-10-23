// The screens over the canvas: title, pause, shop, and game over, plus the
// on-screen controls. They render from a `View` and report actions upward.
import { type MouseEvent, type ReactNode, useEffect, useRef } from "react";
import type { View } from "./session.ts";
import { SHOP_ITEMS, type ShopItem } from "./sim.ts";

function bestText(view: View) {
  const { best } = view;
  return best ? `Best: level ${best.level} with $${best.money}` : null;
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
    <Panel label="Gold Miner">
      <h1>Gold Miner</h1>
      <p className="tagline">
        Swing the claw, haul up gold and diamonds, and reach each level's goal
        before time runs out.
      </p>
      <p className="keys">
        <kbd>↓</kbd> or <kbd>Space</kbd> fire · <kbd>↑</kbd> dynamite ·{" "}
        <kbd>P</kbd> pause · or tap the mine
      </p>
      {best && <p className="muted">{best}</p>}
      <button
        type="button"
        className="button primary"
        onClick={onPlay}
      >
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
      <button
        type="button"
        className="button primary"
        onClick={onResume}
      >
        Resume
      </button>
      <button type="button" className="button" onClick={onQuit}>
        Quit to title
      </button>
    </Panel>
  );
}

export function ShopScreen({
  view,
  onBuy,
  onContinue,
}: {
  view: View;
  onBuy: (item: ShopItem) => void;
  onContinue: () => void;
}) {
  return (
    <Panel label="Shop">
      <h2>Level {view.level} cleared!</h2>
      <p>
        {`You have $${view.money}. The next goal is $${view.nextGoal}; ` +
          "spending money here makes it harder to reach."}
      </p>
      <div className="offers">
        {view.offers.map((offer) => {
          const info = SHOP_ITEMS[offer.item];
          return (
            <button
              key={offer.item}
              type="button"
              className="offer"
              disabled={offer.sold || view.money < offer.price}
              onClick={() => onBuy(offer.item)}
            >
              <span className="offer-name">{info.label}</span>
              <span className="offer-price">
                {offer.sold ? "Bought" : `$${offer.price}`}
              </span>
              <span className="offer-description">{info.description}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="button primary"
        onClick={onContinue}
      >
        Start level {view.level + 1}
      </button>
    </Panel>
  );
}

export function GameOverScreen({
  view,
  onPlayAgain,
  onQuit,
}: {
  view: View;
  onPlayAgain: () => void;
  onQuit: () => void;
}) {
  const best = bestText(view);
  return (
    <Panel label="Game over">
      <h2>Game over</h2>
      <p>
        {`You missed the $${view.goal} goal on level ${view.level}, ` +
          `with $${view.money}.`}
      </p>
      {view.newBest
        ? <p className="highlight">New best!</p>
        : best && <p className="muted">{best}</p>}
      <button
        type="button"
        className="button primary"
        onClick={onPlayAgain}
      >
        Play again
      </button>
      <button type="button" className="button" onClick={onQuit}>
        Quit to title
      </button>
    </Panel>
  );
}

/**
 * Buttons over the corner of the mine. They give up focus after a click so
 * Space keeps firing the claw instead of pressing the button again.
 */
export function Controls({
  view,
  onDynamite,
  onPause,
  onMute,
}: {
  view: View;
  onDynamite: () => void;
  onPause: () => void;
  onMute: () => void;
}) {
  const playing = view.phase === "playing" && !view.paused;
  const press =
    (action: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
      action();
      event.currentTarget.blur();
    };
  return (
    <div className="controls">
      <button
        type="button"
        className="control"
        disabled={!playing || view.dynamite === 0}
        onClick={press(onDynamite)}
      >
        Dynamite <span className="count">{view.dynamite}</span>
      </button>
      <button
        type="button"
        className="control"
        disabled={view.phase !== "playing"}
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
  );
}
