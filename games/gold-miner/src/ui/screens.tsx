// The screens over the canvas: title, pause, shop, and game over, plus the
// on-screen controls. They render from a `View` and report actions upward.
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import type { View } from "../runtime/session.ts";
import { CoinIcon, GemIcon, NuggetIcon, ShopIcon, Shopkeeper } from "./art.tsx";
import { SHOP_ITEMS, type ShopItem } from "../game/shop.ts";

function bestText(view: View) {
  const { best } = view;
  return best ? `Best: level ${best.level} with $${best.money}` : null;
}

/**
 * A screen over the canvas. Like a modal dialog, it moves focus to its main
 * (`.primary`) button when it opens, so Enter or Space picks it.
 */
function Panel(
  { label, className, children }: {
    label: string;
    className?: string;
    children: ReactNode;
  },
) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>(".primary")?.focus();
  }, []);
  return (
    <div className="overlay">
      <div
        ref={ref}
        className={className ? `panel ${className}` : "panel"}
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
      <div className="logo">
        <NuggetIcon />
        <h1>Gold Miner</h1>
        <GemIcon />
      </div>
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

/**
 * The general store between levels: the storekeeper behind his counter, the
 * day's goods standing on it with price tags. Pointing at or focusing an item
 * has him describe it; clicking buys it.
 */
export function ShopScreen({
  view,
  onBuy,
  onContinue,
}: {
  view: View;
  onBuy: (item: ShopItem) => void;
  onContinue: () => void;
}) {
  const [talk, setTalk] = useState<{ item: ShopItem; bought: boolean } | null>(
    null,
  );
  const about = (item: ShopItem) => () => {
    if (talk?.item !== item) setTalk({ item, bought: false });
  };

  let speech: ReactNode = "Howdy, partner! Have a look at today's goods.";
  if (talk?.bought) {
    speech = "Pleasure doing business! Good luck down there.";
  } else if (talk) {
    const offer = view.offers.find((o) => o.item === talk.item);
    const info = SHOP_ITEMS[talk.item];
    let note = "";
    if (offer?.sold) note = " You've already got one.";
    else if (offer && offer.price > view.money) {
      note = ` You're $${offer.price - view.money} short.`;
    }
    speech = (
      <>
        <strong>{info.label}:</strong> {info.description}
        {note}
      </>
    );
  }

  return (
    <Panel label="Shop" className="shop">
      <div className="shop-head">
        <h2>Level {view.level} cleared!</h2>
        <p className="purse">
          <CoinIcon />
          <span className="visually-hidden">You have</span> ${view.money}
        </p>
      </div>
      <div className="store">
        <div className="store-back">
          <p className="store-sign" aria-hidden="true">General Store</p>
          <Shopkeeper happy={talk?.bought ?? false} />
          <p className="speech" aria-live="polite">{speech}</p>
        </div>
        <div className="counter" onPointerLeave={() => setTalk(null)}>
          {view.offers.map((offer) => {
            const info = SHOP_ITEMS[offer.item];
            const short = !offer.sold && view.money < offer.price;
            // aria-disabled rather than disabled, so the storekeeper can
            // still describe what you can't buy.
            return (
              <button
                key={offer.item}
                type="button"
                className="offer"
                aria-disabled={offer.sold || short}
                data-short={short || undefined}
                onPointerEnter={about(offer.item)}
                onFocus={about(offer.item)}
                onClick={() => {
                  if (offer.sold || short) return;
                  onBuy(offer.item);
                  setTalk({ item: offer.item, bought: true });
                }}
              >
                <span className="offer-art">
                  <ShopIcon item={offer.item} />
                  {offer.sold && <span className="stamp">Sold</span>}
                </span>
                <span className="tag">
                  <span className="offer-name">{info.label}</span>
                  <span className="offer-price">${offer.price}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="shop-note">
        {`The next goal is $${view.nextGoal}; ` +
          "spending money here makes it harder to reach."}
      </p>
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
