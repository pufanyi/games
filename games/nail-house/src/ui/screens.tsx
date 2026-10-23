// React screens over the canvas: title, stage select, HUD, shop bar, pause,
// help, and the two result screens.
import { CARD_ORDER, DEFENDERS, ENEMIES } from "../game/catalog.ts";
import { LEAF, MAX_HP } from "../game/config.ts";
import { LEVELS } from "../game/levels.ts";
import type { DefenderId, EnemyId } from "../game/types.ts";
import type { CardView, View } from "../runtime/session.ts";

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s-8-4.9-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 3.5C20 16.1 12 21 12 21z" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9h4a2 2 0 0 1 0 4h-4a2 2 0 0 0 0 4h4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function TitleScreen(
  { unlocked, muted, onLevels, onHelp, onMute }: {
    unlocked: number;
    muted: boolean;
    onLevels: () => void;
    onHelp: () => void;
    onMute: () => void;
  },
) {
  return (
    <div className="nh-overlay nh-title">
      <div className="nh-title-card">
        <p className="nh-kicker">A Flash-era tower defence, rebuilt</p>
        <h1>
          NAIL HOUSE
          <span>vs. the Demolition Crew</span>
        </h1>
        <p className="nh-blurb">
          The Ding family will not move. Put them in the windows, spend the
          demolition money they drop, and keep the house standing.
        </p>
        <div className="nh-actions">
          <button
            type="button"
            className="nh-btn nh-btn-primary"
            onClick={onLevels}
          >
            Choose a stage
          </button>
          <button type="button" className="nh-btn" onClick={onHelp}>
            How to play
          </button>
          <button type="button" className="nh-btn nh-btn-icon" onClick={onMute}>
            {muted ? "Sound off" : "Sound on"}
          </button>
        </div>
        <p className="nh-progress">
          {unlocked} of 7 stages unlocked
        </p>
      </div>
    </div>
  );
}

export function LevelSelectScreen(
  { unlocked, onPick, onBack }: {
    unlocked: number;
    onPick: (level: number) => void;
    onBack: () => void;
  },
) {
  return (
    <div className="nh-overlay nh-levels">
      <div className="nh-levels-panel">
        <h2>Choose a stage</h2>
        <div className="nh-level-grid">
          {LEVELS.map((level) => {
            const locked = level.level > unlocked;
            return (
              <button
                type="button"
                key={level.level}
                className={`nh-level${locked ? " is-locked" : ""}${
                  level.survival ? " is-survival" : ""
                }`}
                disabled={locked}
                onClick={() => onPick(level.level)}
              >
                <span className="nh-level-number">
                  {level.survival ? "∞" : level.level}
                </span>
                <span className="nh-level-name">{level.name}</span>
                <span className="nh-level-blurb">
                  {locked ? "Locked" : level.blurb}
                </span>
                {locked && (
                  <span className="nh-lock">
                    <LockIcon />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button type="button" className="nh-btn nh-back" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

export function GameHud(
  { view, onPause, onMute, onHelp }: {
    view: View;
    onPause: () => void;
    onMute: () => void;
    onHelp: () => void;
  },
) {
  const hpRatio = Math.max(0, Math.min(1, view.hp / MAX_HP));
  return (
    <div className="nh-hud">
      <div className="nh-hud-group">
        <div className="nh-stat nh-hp">
          <HeartIcon />
          <div className="nh-hp-track">
            <div
              className="nh-hp-fill"
              style={{ width: `${hpRatio * 100}%` }}
            />
          </div>
          <span>{view.hp}</span>
        </div>
        <div className="nh-stat nh-money">
          <CoinIcon />
          <span>{view.money}</span>
        </div>
      </div>
      <div className="nh-hud-middle">
        <span className="nh-stage-label">
          {view.survival ? "Final Stand" : view.levelName}
        </span>
        <span className="nh-wave">
          {view.survival
            ? `${view.kills} down`
            : `${Math.min(view.spawns, view.total)} / ${view.total} sent`}
        </span>
        {view.hp < MAX_HP && (
          <span className="nh-leaf-hint">
            Vine {view.leafClicks}/{view.leafNeeded}
          </span>
        )}
      </div>
      <div className="nh-hud-buttons">
        <button
          type="button"
          className="nh-icon-btn"
          onClick={onHelp}
          title="How to play"
        >
          ?
        </button>
        <button
          type="button"
          className="nh-icon-btn"
          onClick={onMute}
          title={view.muted ? "Unmute" : "Mute"}
        >
          {view.muted ? "×" : "♪"}
        </button>
        <button
          type="button"
          className="nh-icon-btn"
          onClick={onPause}
          title="Pause"
        >
          II
        </button>
      </div>
    </div>
  );
}

export function CardBar(
  { cards, onBuy }: {
    cards: CardView[];
    onBuy: (type: DefenderId) => void;
  },
) {
  return (
    <div className="nh-cards" role="toolbar" aria-label="Family cards">
      {cards.map((card, index) => {
        const disabled = card.maxed || (!card.deployed && card.blocked);
        return (
          <button
            type="button"
            key={card.type}
            className={[
              "nh-card",
              card.deployed ? "is-out" : "",
              card.affordable ? "is-ready" : "is-poor",
              card.maxed ? "is-max" : "",
              card.blocked && !card.deployed ? "is-blocked" : "",
            ].join(" ")}
            disabled={disabled}
            onClick={() => onBuy(card.type)}
            title={`${card.name} — ${card.role}. ${
              card.maxed ? "Fully upgraded" : `Next: $${card.cost}`
            }`}
          >
            <span className="nh-card-key">{index + 1}</span>
            <span className="nh-card-name">{card.name}</span>
            <span className="nh-card-role">{card.role}</span>
            <span className="nh-card-stars" aria-hidden="true">
              {Array.from(
                { length: 5 },
                (_, star) => (
                  <i key={star} className={star < card.level ? "on" : ""} />
                ),
              )}
            </span>
            <span className="nh-card-cost">
              {card.maxed ? "MAX" : `$${card.cost}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PauseScreen(
  { onResume, onRestart, onLevels, onTitle }: {
    onResume: () => void;
    onRestart: () => void;
    onLevels: () => void;
    onTitle: () => void;
  },
) {
  return (
    <div className="nh-overlay nh-modal-wrap">
      <div className="nh-modal">
        <h2>Paused</h2>
        <p className="nh-muted">The crew waits. The house does not heal.</p>
        <div className="nh-actions nh-actions-column">
          <button
            type="button"
            className="nh-btn nh-btn-primary"
            onClick={onResume}
          >
            Resume
          </button>
          <button type="button" className="nh-btn" onClick={onRestart}>
            Restart stage
          </button>
          <button type="button" className="nh-btn" onClick={onLevels}>
            Stage select
          </button>
          <button type="button" className="nh-btn" onClick={onTitle}>
            Title
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResultScreen(
  { view, onNext, onRetry, onLevels }: {
    view: View;
    onNext: () => void;
    onRetry: () => void;
    onLevels: () => void;
  },
) {
  const won = view.phase === "won";
  return (
    <div className="nh-overlay nh-modal-wrap">
      <div className={`nh-modal nh-result ${won ? "is-won" : "is-lost"}`}>
        <h2>{won ? "The house held!" : "The house came down"}</h2>
        <p className="nh-muted">
          {won
            ? view.survival
              ? "A long stand. The crew will be back."
              : `${view.levelName} cleared in ${view.seconds}s.`
            : "The Ding family needs a new plan, and a new wall."}
        </p>
        {won && view.newUnlock && (
          <p className="nh-unlock">New stage unlocked</p>
        )}
        <dl className="nh-stats">
          <div>
            <dt>Stage</dt>
            <dd>{view.level}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{view.seconds}s</dd>
          </div>
          <div>
            <dt>Kills</dt>
            <dd>{view.kills}</dd>
          </div>
          <div>
            <dt>Treasury</dt>
            <dd>${view.money}</dd>
          </div>
        </dl>
        <div className="nh-actions">
          {won && !view.survival && (
            <button
              type="button"
              className="nh-btn nh-btn-primary"
              onClick={onNext}
            >
              Next stage
            </button>
          )}
          <button type="button" className="nh-btn" onClick={onRetry}>
            Retry
          </button>
          <button type="button" className="nh-btn" onClick={onLevels}>
            Stage select
          </button>
        </div>
      </div>
    </div>
  );
}

const ENEMY_NOTES: Record<EnemyId, string> = {
  grunt: "Fast and cheap. Knives.",
  brute: "Sledgehammer, twice the health.",
  worker: "Shovel, tougher still.",
  biker: "Crate on a bike. Very quick.",
  breaker: "Jackhammer. Stops far from the wall.",
  excavator: "Wrecking ball. Stops furthest out.",
};

const ENEMY_ORDER: readonly EnemyId[] = [
  "grunt",
  "brute",
  "worker",
  "biker",
  "breaker",
  "excavator",
];

export function HelpScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="nh-overlay nh-modal-wrap">
      <div className="nh-modal nh-help">
        <h2>How to play</h2>
        <ul className="nh-list">
          <li>
            Click a family card to move that member into the next free window.
            Deploying costs{" "}
            <b>$100</b>; every family member can be upgraded four times, up to
            level 5.
          </li>
          <li>
            Enemies drop cash. Spend it during the wave; there is no shop
            between stages.
          </li>
          <li>
            Each hit on the house costs 1 HP. Tap the vine at the foot of the
            house ten times to heal 1 HP.
          </li>
          <li>
            Keys: <b>1-6</b> buy cards, <b>P</b> or <b>Esc</b> pauses.
          </li>
        </ul>
        <h3>The family</h3>
        <div className="nh-help-grid">
          {CARD_ORDER.map((type) => {
            const def = DEFENDERS[type];
            return (
              <div key={type} className="nh-help-card">
                <strong>{def.name}</strong>
                <span>{def.role}</span>
                <span>
                  {def.power[0]}-{def.power[4]} damage · range {def.range[0]}
                </span>
                <span>
                  Upgrades: ${def.cost[1]} / ${def.cost[2]} / ${def.cost[3]} /
                  {" "}
                  ${def.cost[4]}
                </span>
              </div>
            );
          })}
        </div>
        <h3>The crew</h3>
        <div className="nh-help-grid">
          {ENEMY_ORDER.map((id) => (
            <div key={id} className="nh-help-card">
              <strong>{ENEMIES[id].name}</strong>
              <span>{ENEMIES[id].hp} HP · ${ENEMIES[id].money}</span>
              <span>{ENEMY_NOTES[id]}</span>
            </div>
          ))}
        </div>
        <p className="nh-muted">
          The vine is worth {LEAF.clicksForHeal}{" "}
          taps per point. The original game was a 4399 Flash title; this is an
          original-code recreation.
        </p>
        <button
          type="button"
          className="nh-btn nh-btn-primary"
          onClick={onClose}
        >
          Back to the wall
        </button>
      </div>
    </div>
  );
}
