import { useEffect, useRef, useState } from "react";
import {
  CHARACTERS,
  ITEM_ICONS,
  ITEM_LABELS,
  MODES,
  THEMES,
} from "../content/catalog.ts";
import { createGame, DEFAULT_SETTINGS, nextRound } from "../game/state.ts";
import type {
  Difficulty,
  Item,
  Settings,
  State,
  Theme,
} from "../game/types.ts";
import { robot } from "../rendering/paint.ts";
import { accessibleStatus } from "../rendering/renderer.ts";
import type { Action } from "../runtime/input.ts";
import { Session } from "../runtime/session.ts";
import "./styles.css";
function Portrait(
  { character, large = false }: { character: number; large?: boolean },
) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, 160, 180);
    robot(c, 80, 135, character, 105, 0);
  }, [character]);
  return (
    <canvas
      ref={ref}
      width="160"
      height="180"
      className={large ? "portrait large" : "portrait"}
      aria-label={`${CHARACTERS[character].name} robot`}
    />
  );
}
const guideItems: Item[] = [
  "power",
  "capacity",
  "speed",
  "kick",
  "shield",
  "invincible",
  "life",
  "hammer",
  "water",
  "laser",
  "flame",
  "rocket",
  "grenade",
  "bowling",
  "horse",
  "bike",
  "car",
  "hovercraft",
];
export function App() {
  const [screen, setScreen] = useState<"menu" | "choose" | "help" | "game">(
    "menu",
  );
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [game, setGame] = useState<State | null>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [music, setMusic] = useState(true);
  const [revision, setRevision] = useState(0);
  const [best, setBest] = useState(0);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null),
    session = useRef<Session | null>(null);
  useEffect(() => {
    try {
      const score = Number(localStorage.getItem("bomb-it-3-best"));
      if (Number.isFinite(score)) setBest(score);
      setMuted(localStorage.getItem("bomb-it-3-muted") === "true");
    } catch { /* Storage is optional. */ }
  }, []);
  useEffect(() => {
    if (screen !== "game" || !game || !canvas.current) return;
    let current: Session;
    try {
      current = new Session(game, canvas.current, (isPaused) => {
        setPaused(isPaused);
        setRevision((n) => n + 1);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start the game.");
      return;
    }
    session.current = current;
    setPaused(false);
    return () => {
      current.dispose();
      session.current = null;
    };
  }, [game, screen]);
  useEffect(() => {
    if (session.current) {
      session.current.sound.muted = muted;
      session.current.sound.music = music;
    }
    try {
      localStorage.setItem("bomb-it-3-muted", String(muted));
    } catch { /* Storage is optional. */ }
  }, [muted, music, game]);
  useEffect(() => {
    if (!game || game.status === "playing") return;
    const score = Math.max(
      ...game.players.filter((p) => p.human).map((p) => p.score),
    );
    if (score > best) {
      setBest(score);
      try {
        localStorage.setItem("bomb-it-3-best", String(score));
      } catch { /* Storage is optional. */ }
    }
  }, [game, revision, best]);
  const patch = (next: Partial<Settings>) =>
    setSettings((s) => ({ ...s, ...next }));
  const start = () => {
    setError("");
    setGame(
      createGame(settings, crypto.getRandomValues(new Uint32Array(1))[0]),
    );
    setScreen("game");
  };
  const leave = () => {
    setScreen("menu");
    setGame(null);
    setError("");
  };
  const touch = (id: number, action: Action | null) => {
    if (!session.current || session.current.paused) return;
    session.current.sound.unlock();
    session.current.controls.pointer(id, action);
  };
  const title = (
    <div className="brand">
      <span className="brand-small">THE LITTLE ROBOT RUMBLE</span>
      <h1>
        BOMB IT <span>3</span>
        <i aria-hidden="true">✦</i>
      </h1>
      <p>Big adventures. Little troublemakers.</p>
    </div>
  );
  if (screen === "help") {
    return (
      <main className="lobby">
        <div className="sheet guide">
          <div className="eyebrow">FIELD GUIDE</div>
          <h1>A little help before the boom.</h1>
          <p>
            Single player: arrow keys or WASD to move, Space or Enter to use
            your weapon. Two players: P1 uses WASD + Space; P2 uses arrows +
            Enter.
          </p>
          <p>
            Press P or Escape to pause. Changing tabs pauses automatically.
            Touch controls operate Player 1; two-player mode needs a keyboard.
          </p>
          <div className="guide-modes">
            {MODES.map((m) => (
              <article key={m.id}>
                <strong>{m.icon} {m.title}</strong>
                <p>{m.objective}</p>
              </article>
            ))}
          </div>
          <h2>Pocket-sized power-ups</h2>
          <div className="item-guide">
            {guideItems.map((item) => (
              <div key={item}>
                <span>{ITEM_ICONS[item]}</span>
                {ITEM_LABELS[item]}
              </div>
            ))}
          </div>
          <p>
            Shields and vehicles absorb one hit. Invincibility is temporary.
            Special weapons have limited uses, then return to your mode’s
            starting weapon. Arrows on the ground mark jump pads and water
            slides; keep clear of moving trains.
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => setScreen("menu")}
          >
            Got it — back to play
          </button>
        </div>
      </main>
    );
  }
  if (screen === "choose") {
    return (
      <main className="lobby">
        <div className="sheet character-sheet">
          <div className="eyebrow">MEET YOUR TROUBLEMAKERS</div>
          <h1>Pick your little legend.</h1>
          <p>Four colors. One very big adventure.</p>
          {Array.from(
            { length: settings.players },
            (_, player) => (
              <section
                key={player === 0 ? "first" : "second"}
                className="character-section"
              >
                <h2>Player {player + 1}</h2>
                <div className="character-grid">
                  {CHARACTERS.map((character, i) => (
                    <button
                      type="button"
                      key={character.name}
                      className={`character ${
                        settings.characters[player] === i ? "selected" : ""
                      }`}
                      aria-pressed={settings.characters[player] === i}
                      disabled={settings.players === 2 &&
                        settings.characters[1 - player] === i}
                      onClick={() => {
                        const next: [number, number] = [...settings.characters];
                        next[player] = i;
                        if (next[1 - player] === i) {
                          next[1 - player] = (i + 1) % 4;
                        }
                        patch({ characters: next });
                      }}
                    >
                      <Portrait character={i} large />
                      <strong>{character.name}</strong>
                      <small>{character.detail}</small>
                    </button>
                  ))}
                </div>
              </section>
            ),
          )}
          <div className="choose-footer">
            <button
              type="button"
              className="secondary"
              onClick={() => setScreen("menu")}
            >
              ← Settings
            </button>
            <button type="button" className="primary" onClick={start}>
              Let’s play <span>→</span>
            </button>
          </div>
        </div>
      </main>
    );
  }
  if (screen === "game" && game) {
    const ended = game.status !== "playing",
      complete = game.status === "won" && game.level >= game.settings.levels;
    const exhausted = game.players.filter((p) => p.human).every((p) =>
      p.lives <= 0
    );
    return (
      <main className="play-shell">
        <div className="stage">
          <canvas
            ref={canvas}
            className="game-canvas"
            width="1200"
            height="900"
            aria-label="Bomb It 3 arena"
            tabIndex={0}
          />
          <div className="game-toolbar">
            <button
              type="button"
              aria-label={muted ? "Enable sound" : "Mute sound"}
              onClick={() => {
                setMuted(!muted);
                canvas.current?.focus();
              }}
            >
              {muted ? "Sound off" : "Sound on"}
            </button>
            <button
              type="button"
              onClick={() => {
                session.current?.pause(!paused);
                canvas.current?.focus();
              }}
              disabled={ended}
            >
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
          <span className="sr-only" aria-live="polite">
            {accessibleStatus(game)}
          </span>
          {(paused || ended || error) && (
            <div className="scrim">
              <section
                className="result-panel"
                aria-label={ended ? "Round result" : "Paused"}
              >
                <div className="eyebrow">
                  {error
                    ? "LET’S TRY AGAIN"
                    : paused
                    ? "TAKE A BREATHER"
                    : complete
                    ? "ALL CLEAR"
                    : game.status === "won"
                    ? "NICELY DONE"
                    : "ONE MORE TRY?"}
                </div>
                <h1>
                  {error || (paused
                    ? "Paused"
                    : complete
                    ? "You did it!"
                    : game.status === "won"
                    ? "Level cleared!"
                    : exhausted
                    ? "Game over"
                    : "Round lost")}
                </h1>
                {ended && (
                  <>
                    <div className="result-robots">
                      {game.players.filter((p) => p.human).map((p) => (
                        <div key={p.id}>
                          <Portrait character={p.character} />
                          <strong>Player {p.id + 1}</strong>
                          <p>
                            {p.score.toLocaleString()} points · {p.lives} lives
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="best-score">
                      Personal best {best.toLocaleString()}
                    </p>
                  </>
                )}
                {paused && <p>Your arena is right where you left it.</p>}
                <div className="result-actions">
                  {paused && (
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        session.current?.pause(false);
                        canvas.current?.focus();
                      }}
                    >
                      Keep playing →
                    </button>
                  )}
                  {ended && !complete && !exhausted && (
                    <button
                      type="button"
                      className="primary"
                      onClick={() => setGame(nextRound(game))}
                    >
                      {game.status === "won" ? "Next level →" : "Try again →"}
                    </button>
                  )}
                  {ended && (complete || exhausted) && (
                    <button type="button" className="primary" onClick={start}>
                      Play again →
                    </button>
                  )}
                  <button type="button" className="secondary" onClick={leave}>
                    Main menu
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
        <div className="play-bottom">
          <span>
            {settings.players === 2
              ? "P1  WASD + SPACE    ·    P2  ARROWS + ENTER"
              : "ARROWS / WASD  MOVE    ·    SPACE  ACTION"}
          </span>
          <button
            type="button"
            onClick={() => {
              setMusic(!music);
              canvas.current?.focus();
            }}
          >
            {music ? "Music on" : "Music off"}
          </button>
        </div>
        <fieldset className="touch-controls" aria-label="Touch controls">
          {(["left", "up", "down", "right", "action"] as Action[]).map((
            action,
          ) => (
            <button
              key={action}
              type="button"
              aria-label={action === "action" ? "Use weapon" : `Move ${action}`}
              disabled={paused || ended}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                touch(e.pointerId, action);
              }}
              onPointerUp={(e) => touch(e.pointerId, null)}
              onPointerCancel={(e) => touch(e.pointerId, null)}
              onLostPointerCapture={(e) => touch(e.pointerId, null)}
            >
              {({ left: "←", up: "↑", down: "↓", right: "→", action: "BOOM" })[
                action
              ]}
            </button>
          ))}
        </fieldset>
      </main>
    );
  }
  return (
    <main className="lobby">
      <div className="menu-wrap">
        <header className="menu-top">
          <span className="museum-tag">
            THE GAME MUSEUM <span>/</span> ARCADE No. 03
          </span>
          <button
            type="button"
            className="text-button"
            onClick={() => setScreen("help")}
          >
            How to play <span>↗</span>
          </button>
        </header>
        <section className="hero">
          {title}
          <div className="hero-robots" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="spark spark-one">✦</span>
            <span className="spark spark-two">✧</span>
            <div className="hero-robot first">
              <Portrait character={0} large />
            </div>
            <div className="hero-robot second">
              <Portrait character={1} large />
            </div>
            <span className="hero-note">made for a little friendly chaos</span>
          </div>
        </section>
        <section className="setup">
          <div className="section-title">
            <h2>Choose your adventure</h2>
            <span>01 / GAME MODE</span>
          </div>
          <div className="mode-grid">
            {MODES.map((m) => (
              <button
                type="button"
                key={m.id}
                className={`mode-card ${
                  settings.mode === m.id ? "active" : ""
                }`}
                aria-pressed={settings.mode === m.id}
                onClick={() => patch({ mode: m.id })}
              >
                <span className={`mode-icon ${m.id}`}>{m.icon}</span>
                <strong>{m.title}</strong>
                <small>{m.subtitle}</small>
                <span className="mode-check">
                  {settings.mode === m.id ? "✓" : "○"}
                </span>
              </button>
            ))}
          </div>
          <p className="mode-description">
            {MODES.find((m) => m.id === settings.mode)?.objective}
          </p>
          <div className="settings-grid">
            <label>
              Players<select
                value={settings.players}
                onChange={(e) => {
                  const players = e.target.value === "2" ? 2 : 1;
                  patch({
                    players,
                    enemies: Math.min(settings.enemies, 4 - players),
                  });
                }}
              >
                <option value="1">One player</option>
                <option value="2">Two players · same keyboard</option>
              </select>
            </label>
            <label>
              Opponents<select
                value={settings.enemies}
                onChange={(e) => patch({ enemies: Number(e.target.value) })}
              >
                {Array.from(
                  { length: 4 - settings.players },
                  (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} computer {i === 0 ? "rival" : "rivals"}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Difficulty<select
                value={settings.difficulty}
                onChange={(e) =>
                  patch({ difficulty: e.target.value as Difficulty })}
              >
                <option value="easy">Easy going</option>
                <option value="normal">A fair challenge</option>
                <option value="hard">Bring it on</option>
              </select>
            </label>
            <label>
              Adventure length<select
                value={settings.levels}
                onChange={(e) => patch({ levels: Number(e.target.value) })}
              >
                {[3, 5, 10, 15].map((n) => (
                  <option key={n} value={n}>{n} levels</option>
                ))}
              </select>
            </label>
          </div>
          <div className="section-title arena-title">
            <h2>Somewhere to make a mess</h2>
            <span>02 / ARENA</span>
          </div>
          <div className="arena-grid">
            {THEMES.map((theme) => (
              <button
                type="button"
                key={theme.id}
                aria-pressed={settings.theme === theme.id}
                className={`arena-card ${theme.id} ${
                  settings.theme === theme.id ? "selected" : ""
                }`}
                onClick={() => patch({ theme: theme.id })}
              >
                <div className="arena-picture">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <span>
                    {theme.id === "farm"
                      ? "☀"
                      : theme.id === "shop"
                      ? "✿"
                      : theme.id === "city"
                      ? "☾"
                      : "≈"}
                  </span>
                </div>
                <strong>{theme.title}</strong>
              </button>
            ))}
            <button
              type="button"
              className={`arena-card random ${
                settings.theme === "random" ? "selected" : ""
              }`}
              aria-pressed={settings.theme === "random"}
              onClick={() => patch({ theme: "random" as Theme | "random" })}
            >
              <div className="arena-picture">
                <span>?</span>
              </div>
              <strong>Surprise me</strong>
            </button>
          </div>
          <footer className="setup-footer">
            <div>
              <strong>Bring a friend. Bring your game face.</strong>
              <span>1–2 players · 4 worlds · plenty of surprises</span>
            </div>
            <button
              type="button"
              className="primary"
              onClick={() => setScreen("choose")}
            >
              Choose character <span>→</span>
            </button>
          </footer>
        </section>
        <footer className="lobby-footer">
          <span>A fresh recreation of a Flash-era favorite.</span>
          <span>BEST {best.toLocaleString()}</span>
        </footer>
      </div>
    </main>
  );
}
