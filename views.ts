import type { Game } from "./games.ts";

export interface GameListing extends Game {
  /** Whether `games/<slug>/index.html` exists yet. */
  playable: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Stable per-game hue so every cover gets its own color without needing art.
function hueFor(slug: string): number {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
${body}
</body>
</html>
`;
}

function renderCard(game: GameListing): string {
  const title = escapeHtml(game.title);
  const tags = game.tags
    .map((tag) => `<li class="tag">${escapeHtml(tag)}</li>`)
    .join("");
  const status = game.playable
    ? `<span class="badge badge-ready">Play</span>`
    : `<span class="badge">Coming soon</span>`;
  const search = escapeHtml(
    [game.title, game.description, ...game.tags].join(" ").toLowerCase(),
  );

  return `<li class="game" data-search="${search}">
  <a class="game-link" href="/games/${encodeURIComponent(game.slug)}/">
    <div class="cover" style="--hue: ${hueFor(game.slug)}" aria-hidden="true">
      <span class="cover-letter">${escapeHtml(game.title.charAt(0))}</span>
    </div>
    <div class="game-body">
      <div class="game-heading">
        <h2 class="game-title">${title}</h2>
        ${status}
      </div>
      <p class="game-description">${escapeHtml(game.description)}</p>
      <ul class="tags" aria-label="Tags">${tags}</ul>
    </div>
  </a>
</li>`;
}

export function renderHome(games: GameListing[]): string {
  const cards = games.map(renderCard).join("\n");
  const playable = games.filter((game) => game.playable).length;
  const list = games.length > 0
    ? `<ul class="games" id="games" data-view="grid">\n${cards}\n</ul>
<p class="empty" id="no-results" hidden>No games match your search.</p>`
    : `<p class="empty">No games yet. Add one to <code>games.ts</code>.</p>`;

  return layout(
    "Arcade",
    `<header class="site-header">
  <div class="wrap">
    <h1 class="site-title">Arcade</h1>
    <p class="site-subtitle">Classic browser games, rebuilt to play again.
      <span class="count">${playable} of ${games.length} playable</span></p>
  </div>
</header>
<main class="wrap">
  <div class="toolbar">
    <label class="search">
      <span class="visually-hidden">Search games</span>
      <input type="search" id="search" placeholder="Search games" autocomplete="off">
    </label>
    <div class="view-toggle" role="group" aria-label="Layout">
      <button type="button" data-view="grid" aria-pressed="true">Grid</button>
      <button type="button" data-view="list" aria-pressed="false">List</button>
    </div>
  </div>
  ${list}
</main>
<script src="/static/app.js" type="module"></script>`,
  );
}

export function renderComingSoon(game: Game): string {
  const title = escapeHtml(game.title);
  const hue = hueFor(game.slug);
  const entry = `games/${escapeHtml(game.slug)}/index.html`;
  return layout(
    `${game.title} · Arcade`,
    `<main class="wrap notice">
  <div class="cover cover-large" style="--hue: ${hue}" aria-hidden="true">
    <span class="cover-letter">${escapeHtml(game.title.charAt(0))}</span>
  </div>
  <h1>${title}</h1>
  <p>This game hasn't been built yet. Create
    <code>${entry}</code> to make it playable.</p>
  <a class="back" href="/">← Back to all games</a>
</main>`,
  );
}

export function renderNotFound(): string {
  return layout(
    "Not found · Arcade",
    `<main class="wrap notice">
  <h1>Game not found</h1>
  <p>There's no game at this address.</p>
  <a class="back" href="/">← Back to all games</a>
</main>`,
  );
}
