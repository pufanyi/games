# AGENTS.md

Guidance for coding agents working in this repo. **Keep it current:** after
finishing any task, check whether it changed something documented here
(structure, commands, conventions, decisions) and update this file in the same
change.

## Project

A collection of fun, original browser games, inspired by the immediacy and
variety of sites like 4399. Familiar genres are a starting point; fidelity to
existing games is not a goal. Prefer clear rules, satisfying choices, and simple
code over reproducing historical mechanics or implementation details. It will be
hosted at games.pufanyi.com. The architecture is in
[`docs/architecture.md`](docs/architecture.md); read it before changing how the
platform and games fit together.

- **Platform** (`platform/`): React + TypeScript. Catalog, coming-soon pages,
  and direct game navigation.
- **Games** (`games/<slug>/`): independent web apps, in any browser technology,
  each publishing a static build with an `index.html`. They open directly in the
  current tab at `/games/<slug>/`, filling the browser viewport without an
  iframe.

## Stack

- [Deno](https://deno.com) 2.9+ is the runtime, package manager, and toolchain.
  npm packages are declared in `deno.json` (`nodeModulesDir: "auto"` creates
  `node_modules/` for Vite and Wrangler); there is no `package.json`. Node is
  only used to run Wrangler. The root `deno.json` is a workspace: every game
  with its own `deno.json` is listed in `"workspace"`, so root `deno check`,
  `deno test`, and `deno fmt` cover it.
- **Vite** builds the platform's browser code and runs the dev server. In dev,
  `platform/dev.ts` (a Vite plugin) sends platform routes through the same
  `createHandler` as production, and serves games from their published folders.
- **React** pages are rendered to HTML by `platform/app.tsx`, which is
  runtime-neutral; each entry point supplies only file access:
  - `main.ts`: Deno server for the production build in `dist/`.
  - `worker.ts`: Cloudflare Worker, the production deploy. Keep
    `platform/app.tsx`, `pages.tsx`, and `games.ts` free of `Deno.*` and
    `node:*` APIs so it still bundles.
  - `platform/dev.ts`: the Vite dev server.
- Deploy: Cloudflare Workers Builds runs `npx wrangler deploy` on pushes to
  `main` and `npx wrangler preview` on other branches (which is why
  `wrangler.jsonc` keeps an empty `previews` block). Its `build.command` runs
  `deno task build` first (through the `deno` npm package, since the build image
  has no Deno). `dist/` is uploaded as Workers Static Assets; `run_worker_first`
  sends every request through `worker.ts`, which reads files via the `ASSETS`
  binding. `tsconfig.worker.json` only tells Wrangler's bundler how to compile
  JSX. The Worker `name` must match the Worker in the Cloudflare dashboard.
- The Deno agent skill lives in `.agents/skills/deno` (symlinked into
  `.claude/skills/deno`, pinned in `skills-lock.json`). For version-accurate CLI
  details, prefer `deno <cmd> --help`.
- Linting is [Biome](https://biomejs.dev) (`biome.json`, recommended preset),
  run through Deno from npm. `deno lint` is not used. Biome's formatter and
  assist (import sorting) are disabled so they don't fight `deno fmt`, which
  owns formatting. Biome's version is pinned twice and must be bumped together:
  `deno.json` (used by `deno task lint` locally) and the `$schema` URL in
  `biome.json` (read by `biomejs/setup-biome` in CI). CI fails if they differ.
- CI is GitHub Actions (`.github/workflows/ci.yml`), on every PR and push to
  `main`, as two parallel jobs:
  - `biome`: Biome's official action plus `biome ci`, which posts lint findings
    as inline PR annotations.
  - `deno`: fmt check, type check, build, and tests on Deno `2.9.x`.

## Layout

```
platform/
  app.tsx          routing + server rendering: /, /play/<slug>, /games/<slug>/...
  pages.tsx        React pages (catalog, play, not found)
  client.tsx       browser entry: hydrates the server-rendered page
  games.ts         game registry (slug, title, description, tags)
  game_builds.ts   where each game's published build comes from
  dev.ts           Vite dev-server plugin
  styles.css       platform styles (Material Design 3 tokens + components)
  fonts/           bundled Roboto Flex (latin, wght axis) + its OFL license
  app_test.tsx     routing tests with fake files
games/<slug>/      one independent game per folder
  deno.json        the game's own tasks (dev, build) and dependencies
  src/             game source; dist/ is its build (gitignored)
scripts/
  build_games.ts   publishes games to dist/games/<slug>/
docs/
  architecture.md  the architecture draft and how the repo implements it
main.ts            Deno server entry point (serves dist/)
worker.ts          Cloudflare Worker entry point (+ worker_test.ts)
vite.config.ts     Vite: dev server and platform build
wrangler.jsonc     Cloudflare deploy config (+ tsconfig.worker.json)
biome.json         Biome linter config
.github/           CI workflow
```

`dist/` (build output) and `node_modules/` are generated and gitignored.

## Commands

```sh
deno task dev     # Vite dev server on http://localhost:8000, with hot reload
                  # (games show from their last build: run `deno task build`)
deno task --cwd games/<slug> dev   # one game on its own, with hot reload
deno task build   # platform assets + published games into dist/
deno task start   # serve dist/ with the Deno server (build first)
deno task test    # tests
deno task lint    # Biome lint; warnings fail too
npx wrangler dev  # run the Cloudflare Worker locally (builds first; needs Node)
npx wrangler deploy --dry-run   # check the Worker bundles and assets upload
deno fmt --check && deno task lint && deno check && deno task build && deno task test   # = CI
```

Run the CI line before calling a task done. If you add a step to CI, add it to
that line too (and vice versa).

## Adding a game

1. Add an entry to `games` in `platform/games.ts`. The `slug` is the folder name
   and URL.
2. Create `games/<slug>/`, with either:
   - a static site with an `index.html`, published as-is (minus `DESIGN.md`,
     dotfiles, and `node_modules`), or
   - a `build` task in its own `deno.json` (or a `build` script in its
     `package.json`) that writes a static build with an `index.html` to
     `games/<slug>/dist/`. Add a game with a `deno.json` to `"workspace"` in the
     root `deno.json`. `games/gold-miner/` is the example to copy: Vite with
     `base: "./"` so its asset URLs stay relative.

- The platform shows "Coming soon" for a game until its build has an
  `index.html`, then marks it playable. Nothing else to toggle.
- Games must work on their own at `/games/<slug>/`: relative asset paths
  (`./game.js`), and no imports from `platform/` or other games. `/games/<slug>`
  redirects to `/games/<slug>/` so relative paths resolve.
- Catalog cards open published games directly at `/games/<slug>/` in the current
  tab. Legacy `/play/<slug>` URLs redirect there; unbuilt games retain their
  coming-soon page. Use browser Back to return to the catalog.
- Games should fill their window (`100vw` × `100vh`) and scale to its size. Each
  game owns its responsive layout; there is no platform player wrapper.
- A game can have a `games/<slug>/DESIGN.md` with its requirements as a
  checklist. Read it before working on that game and tick items off as they're
  built. Open decisions are marked **Decision:**; ask the user rather than
  picking one.

## Games

| Game         | Status                                                              | Design                         |
| ------------ | ------------------------------------------------------------------- | ------------------------------ |
| Gold Miner   | v1: single-player complete; multiplayer not started                 | `games/gold-miner/DESIGN.md`   |
| Billiards    | Single-player complete; two-player not started                      | `games/billiards/DESIGN.md`    |
| Bomb It 3    | Four modes and local two-player; fidelity gaps documented           | `games/bomb-it-3/DESIGN.md`    |
| Nail House   | Seven stages, six family cards, fixed enemy routes and attacks      | —                              |
| Kingdom Rush | All 17 stages and 3 modes; tower and enemy abilities partly missing | `games/kingdom-rush/DESIGN.md` |

## Coding standard

### Nail House module guide

- `game/sim.ts`: game creation, tick order, healing, and win/loss transitions.
- `game/combat.ts`: targeting, attacks, projectiles, damage, and burning areas.
- `game/shop.ts`: card availability, purchases, and upgrades.
- `game/waves.ts`: wave timing and enemy entrances.
- `game/effects.ts`: floating text and expanding rings; drawing stays in
  `rendering/`.
- `game/catalog.ts`, `config.ts`, and `levels.ts`: balance and layout data.
- `runtime/session.ts`: menus, sound events, and saved progress around the game.

Nail House uses no random numbers or seeds. Enemies cycle through configured
entrances and weapons aim at fixed points with movement prediction. Tune these
rules for enjoyable play; do not add compatibility with an older game's code.
Stage seven is survival with long finite waves (999 of each enemy type), not
unlimited spawning.

### Platform (`platform/`)

- **TypeScript only** (`.ts`, `.tsx`). No `.js` source files. Strict type
  checking via `deno check`; no `any`, and no `as` casts except at boundaries
  (parsed JSON, DOM lookups, CSS custom properties in `style`).
- **React function components and hooks.** No class components. One page or
  component per concern; shared pieces live next to the pages that use them
  until a second file needs them.
- **Pages render on the server first.** Anything a page needs goes in its `Page`
  props, which are serialized for hydration, so server and client render the
  same markup. Read browser-only state (`localStorage`, `window`) in
  `useEffect`, never during render.
- Keep `platform/app.tsx`, `pages.tsx`, and `games.ts` runtime-neutral (no
  `Deno.*` or `node:*`); runtime-specific code goes in `main.ts`, `worker.ts`,
  or `dev.ts`.
- Use relative imports with explicit extensions (`./games.ts`) and bare
  specifiers mapped in `deno.json` (`react`, `vite`). Pin npm versions exactly.

### Games (`games/<slug>/`)

- **Any browser technology** (see `docs/architecture.md`). The platform depends
  only on the published static build.
- Games we write here default to **TypeScript, built with Vite**, as a
  standalone app with its own `deno.json` `build` task. Pick the rendering
  approach per game and note it in its `DESIGN.md`:
  - Turn-based or UI-heavy games (puzzles, cards) can be React apps.
  - Real-time games keep game logic in plain TS (pure, deterministic, tested
    with `deno test`) and draw on a `<canvas>`; menus and HUD may use React or
    the DOM, but React never re-renders every frame.
  - An engine (Phaser, Kaplay, …) only when a game needs what it provides.
- A game never imports platform code, and must run when opened directly.

### Everywhere

- Use English for all development artifacts: identifiers, comments, UI copy,
  documentation, test descriptions, commit messages, and pull requests. This is
  a persistent project preference; conversation can follow the user's language.

- Permissions stay scoped: `--allow-net --allow-read=.` for servers. Don't
  switch tasks to `-A`; add the specific `--allow-*` flag a new feature needs.
  Exceptions: the Vite tasks (`dev`, the first half of `build`) use `-A` because
  Vite and its native bundler need nearly every permission, and `lint` needs
  `--allow-run` to launch Biome's native binary.
- Fix Biome findings rather than suppressing them; if a rule truly doesn't fit,
  turn it off in `biome.json` with a short reason in the PR.
- Never build HTML by concatenating unescaped values: render with React, or
  escape (`escapeHtml` in `platform/app.tsx`). Serialized page data escapes `<`.
- Styling: plain CSS with custom properties on `:root` and a
  `prefers-color-scheme: dark` override; new UI uses those tokens and works at
  phone width (16px gutters, no horizontal scroll).
- The platform follows **Material Design 3**, hand-rolled (no UI library):
  `platform/styles.css` defines M3 `--md-sys-*` tokens (color, typescale, shape,
  elevation, motion, state layers) and component classes named after the M3
  component (`card`, `chip`, `segmented-button`, `search-bar`, `button-filled`,
  ...). The color roles are the tonal-spot scheme that
  `@material/material-color-utilities` generates from seed `#4f46e5`; regenerate
  the whole set rather than editing single roles. Type is Roboto Flex. Games
  keep their own look.
- Third-party assets (fonts, images, sounds) need a license that allows
  redistribution, and are bundled with the game alongside their license file
  (e.g. `games/gold-miner/src/fonts/`), not loaded from a CDN, so games work
  offline and on their own.
- `localStorage` access is wrapped in try/catch and only for per-viewer
  conveniences (e.g. the remembered grid/list view).
- Unit tests sit next to their modules (`*_test.ts`/`*_test.tsx`) so behavior
  and tests move together. They are separate files, never imported by production
  entry points; Vite bundles reachable imports, not every file under `src/`.
  Reserve a game-local `tests/e2e/` for future browser tests that span features.
  Test logic without a browser: routing with fake files, game rules through the
  pure simulation.
- Comments explain why, not what. Match the surrounding code's density.
- Commit messages: short imperative subject, wrapped body explaining why.

## Workflow

Each finished task lands as its own pull request:

1. Branch from an up-to-date `main` (never commit to `main` directly).
2. Make the change, including any `AGENTS.md` updates it calls for.
3. Run the CI line from [Commands](#commands).
4. Commit, push, and open a PR against `main` with `gh pr create`.
5. Watch the CI run (`gh pr checks --watch`) and fix it if it fails, including
   the Cloudflare `Workers Builds: games` check.
