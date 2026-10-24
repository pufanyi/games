// Platform pages. Rendered to HTML on the server (app.tsx) and hydrated in the
// browser (client.tsx) from the same props. Styled as Material Design 3
// components in plain CSS (styles.css); class names follow the M3 component.
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import type { Game } from "./games.ts";

export interface GameListing extends Game {
  /** Whether the game's build (`/games/<slug>/index.html`) is published. */
  playable: boolean;
}

/** Everything a page needs, serialized into the HTML for hydration. */
export type Page =
  | { name: "catalog"; games: GameListing[] }
  | { name: "play"; game: GameListing }
  | { name: "notFound" };

export function PageView({ page }: { page: Page }) {
  switch (page.name) {
    case "catalog":
      return <Catalog games={page.games} />;
    case "play":
      return <Play game={page.game} />;
    case "notFound":
      return <NotFound />;
  }
}

export function pageTitle(page: Page): string {
  switch (page.name) {
    case "catalog":
      return "Arcade";
    case "play":
      return `${page.game.title} · Arcade`;
    case "notFound":
      return "Not found · Arcade";
  }
}

// Stable per-game hue so every cover gets its own color without needing art.
function hueFor(slug: string): number {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

function Cover({ game, large = false }: { game: Game; large?: boolean }) {
  const style = { "--hue": hueFor(game.slug) } as CSSProperties;
  return (
    <div
      className={large ? "cover cover-large" : "cover"}
      style={style}
      aria-hidden="true"
    >
      <span className="cover-letter">{game.title.charAt(0)}</span>
    </div>
  );
}

type View = "grid" | "list";
const VIEW_KEY = "arcade:view";

function Catalog({ games }: { games: GameListing[] }) {
  const [view, setView] = useState<View>("grid");
  const [query, setQuery] = useState("");
  const playable = games.filter((game) => game.playable).length;

  // Read the saved view after hydration so the server and client markup match.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      // Storage may be unavailable (private mode); keep the default.
    }
  }, []);

  function chooseView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // The toggle still works without storage.
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter((game) =>
      [game.title, game.description, ...game.tags]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [games, query]);

  return (
    <>
      <header className="top-app-bar top-app-bar-large">
        <div className="wrap">
          <h1 className="top-app-bar-headline">Arcade</h1>
          <p className="top-app-bar-supporting">
            Classic browser games, rebuilt to play again.
          </p>
          <p className="count">{`${playable} of ${games.length} playable`}</p>
        </div>
      </header>
      <main className="wrap">
        <div className="toolbar">
          <label className="search-bar">
            <span className="visually-hidden">Search games</span>
            <input
              type="search"
              placeholder="Search games"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <fieldset className="segmented-button">
            <legend className="visually-hidden">Layout</legend>
            {(["grid", "list"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className="segment"
                aria-pressed={view === option}
                onClick={() => chooseView(option)}
              >
                {option === "grid" ? "Grid" : "List"}
              </button>
            ))}
          </fieldset>
        </div>
        {games.length === 0
          ? (
            <p className="empty">
              No games yet. Add one to <code>platform/games.ts</code>.
            </p>
          )
          : (
            <>
              <ul className="games" data-view={view}>
                {visible.map((game) => (
                  <GameCard
                    key={game.slug}
                    game={game}
                  />
                ))}
              </ul>
              {visible.length === 0 && (
                <p className="empty">No games match your search.</p>
              )}
            </>
          )}
      </main>
    </>
  );
}

function GameCard({ game }: { game: GameListing }) {
  return (
    <li className="game">
      <a
        className="card state-layer"
        href={game.playable
          ? `/games/${encodeURIComponent(game.slug)}/`
          : `/play/${encodeURIComponent(game.slug)}`}
      >
        <Cover game={game} />
        <div className="card-body">
          <div className="card-heading">
            <h2 className="card-title">{game.title}</h2>
            {game.playable
              ? <span className="status status-ready">Play</span>
              : <span className="status">Coming soon</span>}
          </div>
          <p className="card-supporting">{game.description}</p>
          <ul className="chips" aria-label="Tags">
            {game.tags.map((tag) => <li key={tag} className="chip">{tag}</li>)}
          </ul>
        </div>
      </a>
    </li>
  );
}

function Play({ game }: { game: GameListing }) {
  return (
    <>
      <header className="top-app-bar">
        <div className="wrap top-app-bar-row">
          <a className="button button-text state-layer" href="/">
            ← All games
          </a>
          <h1 className="top-app-bar-title">{game.title}</h1>
        </div>
      </header>
      <main className="wrap notice">
        <Cover game={game} large />
        <h2 className="notice-headline">Coming soon</h2>
        <p>This game is not available yet. Check back soon.</p>
        <p>{game.description}</p>
      </main>
    </>
  );
}

function NotFound() {
  return (
    <main className="wrap notice">
      <h1 className="notice-headline">Game not found</h1>
      <p>There's no game at this address.</p>
      <a className="button button-filled state-layer" href="/">
        Back to all games
      </a>
    </main>
  );
}
