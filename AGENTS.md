# AGENTS.md

Guidance for coding agents working in this repo. **Keep it current:** after
finishing any task, check whether it changed something documented here
(structure, commands, conventions, decisions) and update this file in the same
change.

## Project

A web game museum: classic Flash-era browser games, recreated so they can be
played again, on a platform inspired by sites like 4399. It will be hosted at
games.pufanyi.com. The architecture is in
[`docs/architecture.md`](docs/architecture.md); read it before changing how the
platform and games fit together.

- **Platform** (`platform/`): React + TypeScript. Catalog, game pages, and an
  embedded player.
- **Games** (`games/<slug>/`): independent web apps, in any browser technology,
  each publishing a static build with an `index.html`. They run inside an iframe
  on the platform and also work on their own.

There is no Flash emulation (no Ruffle, no `.swf` files) — that is a deliberate
decision, not a gap.

## Stack

- [Deno](https://deno.com) 2.9+ is the runtime, package manager, and toolchain.
  npm packages are declared in `deno.json` (`nodeModulesDir: "auto"` creates
  `node_modules/` for Vite and Wrangler); there is no `package.json`. Node is
  only used to run Wrangler.
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
- Deploy: Cloudflare Workers Builds runs `npx wrangler deploy` on push, using
  `wrangler.jsonc`. Its `build.command` runs `deno task build` first (through
  the `deno` npm package, since the build image has no Deno). `dist/` is
  uploaded as Workers Static Assets; `run_worker_first` sends every request
  through `worker.ts`, which reads files via the `ASSETS` binding.
  `tsconfig.worker.json` only tells Wrangler's bundler how to compile JSX. The
  Worker `name` must match the Worker in the Cloudflare dashboard.
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
  games.ts         game registry (slug, title, description, tags, aspectRatio)
  game_builds.ts   where each game's published build comes from
  dev.ts           Vite dev-server plugin
  styles.css       platform styles
  app_test.tsx     routing tests with fake files
games/<slug>/      one independent game per folder
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
   and URL; `aspectRatio` is the shape the player keeps when scaling.
2. Create `games/<slug>/`, with either:
   - a static site with an `index.html`, published as-is (minus `DESIGN.md`,
     dotfiles, and `node_modules`), or
   - a `build` task in its own `deno.json` (or a `build` script in its
     `package.json`) that writes a static build with an `index.html` to
     `games/<slug>/dist/`.

- The platform shows "Coming soon" for a game until its build has an
  `index.html`, then marks it playable. Nothing else to toggle.
- Games must work on their own at `/games/<slug>/`: relative asset paths
  (`./game.js`), and no imports from `platform/` or other games. `/games/<slug>`
  redirects to `/games/<slug>/` so relative paths resolve.
- The game runs in an iframe that gets keyboard focus when the play page loads.
  It should fill its window (`100vw` × `100vh`) and scale to its size, since the
  player resizes it to fit the screen and for fullscreen.
- The three `sample-*` entries in `platform/games.ts` are layout placeholders;
  remove them as real games are added.
- A game can have a `games/<slug>/DESIGN.md` with its requirements as a
  checklist. Read it before working on that game and tick items off as they're
  built. Open decisions are marked **Decision:**; ask the user rather than
  picking one.

## Games

| Game       | Status              | Design                       |
| ---------- | ------------------- | ---------------------------- |
| Gold Miner | Designed, not built | `games/gold-miner/DESIGN.md` |

## Coding standard

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
- `localStorage` access is wrapped in try/catch and only for per-viewer
  conveniences (e.g. the remembered grid/list view).
- Tests sit next to the code (`*_test.ts`/`*_test.tsx`). Test logic without a
  browser: routing with fake files, game rules through the pure simulation.
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
