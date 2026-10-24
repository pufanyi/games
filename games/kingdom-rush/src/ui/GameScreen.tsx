// The game screen: the canvas the loop draws on, and an HTML HUD on top. The
// HUD re-renders only when its `View` changes; the canvas owns every frame.
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { TowerType } from "../content/types.ts";
import type { Aim, View } from "../runtime/session.ts";
import { Icon } from "./icons.tsx";

export interface GameActions {
  build(type: TowerType): void;
  upgrade(tier: string): void;
  sell(): void;
  aim(aim: Exclude<Aim, null>): void;
  wave(): void;
  speed(speed: number): void;
  pause(): void;
  quit(): void;
  retry(): void;
  next(): void;
}

interface Props {
  view: View;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  actions: GameActions;
  onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>): void;
  onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>): void;
  onPointerLeave(): void;
}

const POWER_LABELS: Record<Exclude<Aim, "rally" | null>, string> = {
  lightning: "Lightning",
  fireball: "Fireball",
  reinforcements: "Militia",
};

const AIM_HINTS: Record<Exclude<Aim, null>, string> = {
  lightning: "Tap an enemy to call down lightning",
  fireball: "Tap the ground to drop a fireball",
  reinforcements: "Tap the road to send militia",
  rally: "Tap a spot to move the rally point",
};

const TOWER_CLASS: Record<TowerType, string> = {
  archer: "archer",
  mage: "mage",
  engineer: "engineer",
  barracks: "barracks",
};

export function GameScreen({
  view,
  canvasRef,
  actions,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
}: Props) {
  const aiming = view.aim !== null;
  const won = view.status === "won";
  return (
    <div className="stage">
      <div className="frame" data-paused={view.paused || undefined}>
        <canvas
          ref={canvasRef}
          className="board"
          aria-label="Kingdom Rush battlefield"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        />

        <div className="hud">
          <div className="hud-top">
            <div className="pills">
              <span className="pill hearts" title="Lives">
                <Icon name="heart" size={16} />
                <strong>{view.lives}</strong>
              </span>
              <span className="pill coins" title="Gold">
                <Icon name="coin" size={16} />
                <strong>{view.cash}</strong>
              </span>
              <span className="pill waves" title="Wave">
                <Icon name="flag" size={16} />
                <strong>{view.wave}/{view.totalWaves}</strong>
              </span>
              <span className="stage-name">
                {view.levelLabel} · {view.modeLabel}
              </span>
            </div>
            <div className="hud-buttons">
              {[1, 2, 3].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  className="icon-button speed"
                  data-active={view.speed === speed}
                  onClick={() => actions.speed(speed)}
                  title={`${speed}× speed`}
                >
                  {speed}×
                </button>
              ))}
              <button
                type="button"
                className="icon-button"
                onClick={actions.pause}
                title="Pause"
              >
                <Icon name="pause" size={14} />
              </button>
            </div>
          </div>

          {aiming && (
            <div className="aim-hint">
              {view.aim ? AIM_HINTS[view.aim] : ""}{" "}
              · tap the field again to cancel
            </div>
          )}

          <div className="hud-bottom">
            <div className="powers">
              {(
                [
                  ["lightning", "bolt"],
                  ["fireball", "meteor"],
                  ["reinforcements", "shield"],
                ] as const
              ).map(([power, icon]) => {
                const state = view.powers[power];
                const disabled = !state.available || state.seconds > 0;
                return (
                  <button
                    key={power}
                    type="button"
                    className="power"
                    data-ready={!disabled}
                    data-armed={view.aim === power}
                    disabled={disabled}
                    onClick={() => actions.aim(power)}
                    title={POWER_LABELS[power]}
                  >
                    <Icon name={icon} size={20} />
                    {!state.available && <span className="power-off">off</span>}
                    {state.available && state.seconds > 0 && (
                      <span className="power-timer">{state.seconds}</span>
                    )}
                    <span className="power-name">{POWER_LABELS[power]}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="wave-button"
              data-action={view.waveView.action}
              disabled={view.waveView.action === "wait"}
              onClick={actions.wave}
            >
              {view.waveView.label}
            </button>
          </div>

          {view.buildOptions.length > 0 && (
            <div className="panel build-panel">
              <h2>Build</h2>
              {view.buildOptions.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  className="build-row"
                  data-tower={TOWER_CLASS[option.type]}
                  disabled={!option.affordable}
                  onClick={() => actions.build(option.type)}
                >
                  <span className="build-glyph" />
                  <span className="build-text">
                    <strong>
                      {option.name} <em>{option.cost}g</em>
                    </strong>
                    <small>{option.description}</small>
                  </span>
                </button>
              ))}
            </div>
          )}

          {view.selectedTower && (
            <div className="panel tower-panel">
              <header>
                <h2>
                  {view.selectedTower.name}{" "}
                  <span className="level-tag">
                    Lv {view.selectedTower.level}
                  </span>
                </h2>
                <button
                  type="button"
                  className="rally"
                  onClick={() => actions.aim("rally")}
                  hidden={!view.selectedTower.canRally}
                  title="Move the rally point"
                >
                  Rally
                </button>
              </header>
              {view.selectedTower.building
                ? <p className="building">Under construction…</p>
                : <p className="blurb">{view.selectedTower.description}</p>}
              <ul className="stats">
                {view.selectedTower.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {view.selectedTower.upgrades.length > 0 && (
                <div className="upgrades">
                  <h3>Upgrade</h3>
                  {view.selectedTower.upgrades.map((upgrade) => (
                    <button
                      key={upgrade.key}
                      type="button"
                      className="build-row"
                      disabled={!upgrade.affordable}
                      onClick={() => actions.upgrade(upgrade.key)}
                      title={upgrade.description}
                    >
                      <span className="build-text">
                        <strong>
                          {upgrade.name} <em>{upgrade.cost}g</em>
                        </strong>
                        <small>{upgrade.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="sell"
                onClick={actions.sell}
              >
                Sell for {view.selectedTower.sell}g
              </button>
            </div>
          )}
        </div>

        {view.paused && view.status === "playing" && (
          <div className="overlay">
            <div className="card">
              <h2>Paused</h2>
              <p>{view.levelLabel} · {view.modeLabel}</p>
              <div className="card-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={actions.pause}
                >
                  Resume
                </button>
                <button type="button" onClick={actions.retry}>Restart</button>
                <button type="button" onClick={actions.quit}>
                  Level select
                </button>
              </div>
            </div>
          </div>
        )}

        {view.status !== null && view.status !== "playing" && (
          <div className="overlay">
            <div className="card" data-result={view.status}>
              <h2>{won ? "Victory!" : "Defeat"}</h2>
              <p>{view.levelLabel} · {view.modeLabel}</p>
              <ul className="result-stats">
                <li>
                  <span>Waves</span>
                  <strong>{view.wave}/{view.totalWaves}</strong>
                </li>
                <li>
                  <span>Enemies defeated</span>
                  <strong>{view.kills}</strong>
                </li>
                <li>
                  <span>Lives left</span>
                  <strong>{view.lives}</strong>
                </li>
              </ul>
              <div className="card-actions">
                {won && view.nextLevel !== null && (
                  <button
                    type="button"
                    className="primary"
                    onClick={actions.next}
                  >
                    Next level
                  </button>
                )}
                <button type="button" onClick={actions.retry}>Retry</button>
                <button type="button" onClick={actions.quit}>
                  Level select
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="key-hint">
        Space: send wave · 1–3: speed · Esc: pause · tap a tower to upgrade
      </p>
    </div>
  );
}
