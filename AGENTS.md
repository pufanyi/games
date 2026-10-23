# AGENTS.md

Guidance for coding agents working in this repo. **Keep it current:** after
finishing any task, check whether it changed something documented here
(structure, commands, conventions, decisions) and update this file in the same
change.

## Project

A personal arcade: small frontend games recreated from classic Flash games that
can no longer be played. The landing page lists the games; each game is written
from scratch in plain HTML/CSS/JS. There is no Flash emulation (no Ruffle, no
`.swf` files) — that is a deliberate decision, not a gap.

## Stack

- [Deno](https://deno.com) 2.9+ is the runtime, package manager, and toolchain.
  No npm dependencies or build step; Node is only used to run Wrangler for the
  Cloudflare deploy.
- Server: routing lives in `app.ts` (`createHandler`) and is runtime-neutral;
  each entry point supplies only file access. Pages are rendered as HTML strings
  in `views.ts`; there is no framework.
  - `main.ts`: local Deno server (`Deno.serve` + `serveDir` from `@std/http`).
  - `worker.ts`: Cloudflare Worker, the production deploy. Keep `app.ts`,
    `views.ts`, and `games.ts` free of `Deno.*` APIs so it still bundles.
- Deploy: Cloudflare Workers Builds runs `npx wrangler deploy` on push, using
  `wrangler.jsonc`. `static/` and `games/` are uploaded as Workers Static Assets
  (`.assetsignore` filters out everything else in the repo root);
  `run_worker_first` sends every request through `worker.ts`, which reads files
  via the `ASSETS` binding. The Worker `name` must match the Worker in the
  Cloudflare dashboard.
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
  - `deno`: fmt check, type check, and tests on Deno `2.9.x`.

## Layout

```
app.ts           request routing: /, /static/*, /games/<slug>/...
main.ts          Deno server entry point
worker.ts        Cloudflare Worker entry point
wrangler.jsonc   Cloudflare deploy config (+ .assetsignore)
views.ts         HTML rendering (landing, coming-soon, 404) + escapeHtml
games.ts         game registry (slug, title, description, tags)
static/          landing page CSS and JS (grid/list toggle, search)
games/<slug>/    one self-contained static folder per game
main_test.ts     handler tests (Deno entry point)
worker_test.ts   Worker tests with a fake ASSETS binding
biome.json       Biome linter config
.github/         CI workflow
```

## Commands

```sh
deno task dev     # server on http://localhost:8000 with --watch
deno task start   # server without watch
deno task test    # tests (needs --allow-read=., set in the task)
deno task lint    # Biome lint; warnings fail too
npx wrangler dev  # run the Cloudflare Worker locally (needs Node)
npx wrangler deploy --dry-run   # check the Worker bundles and assets upload
deno fmt --check && deno task lint && deno check && deno task test   # = CI
```

Run the CI line before calling a task done. If you add a step to CI, add it to
that line too (and vice versa).

## Adding a game

1. Add an entry to `games` in `games.ts`. The `slug` is the folder name and URL.
2. Create `games/<slug>/index.html` plus any assets beside it.

- A game without `index.html` still gets a clickable card with a "Coming soon"
  badge and placeholder page; once the file exists the badge becomes **Play**.
  This is detected at request time, so there's nothing else to toggle.
- Games must be self-contained: relative asset paths (`./game.js`), no imports
  from `static/` or other games. `/games/<slug>` redirects to `/games/<slug>/`
  so relative paths resolve.
- The three `sample-*` entries in `games.ts` are layout placeholders; remove
  them as real games are added.
- A game can have a `games/<slug>/DESIGN.md` with its requirements as a
  checklist. Read it before working on that game and tick items off as they're
  built. Open decisions are marked **Decision:**; ask the user rather than
  picking one.
- The "coming soon" test picks whichever registered game has no `index.html` yet
  and skips itself once every game is built, so building a game doesn't break
  it.

## Games

| Game       | Status                               | Design                       |
| ---------- | ------------------------------------ | ---------------------------- |
| Gold Miner | Designed, not built (user writes it) | `games/gold-miner/DESIGN.md` |

The user writes the games themselves; don't write game code unless asked.

## Conventions

- Permissions stay scoped: `--allow-net --allow-read=.`. Don't switch tasks to
  `-A`; add the specific `--allow-*` flag a new feature needs. (Exception: the
  `lint` task needs `--allow-run` to launch Biome's native binary.)
- Fix Biome findings rather than suppressing them; if a rule truly doesn't fit,
  turn it off in `biome.json` with a short reason in the PR.
- Escape every interpolated value in `views.ts` with `escapeHtml`.
- Styling uses CSS custom properties on `:root` with a
  `prefers-color-scheme: dark` override; new UI should use those tokens and work
  at phone width.
- `localStorage` access in the browser is wrapped in try/catch and is only for
  per-viewer conveniences (e.g. the remembered grid/list view).
- Commit messages: short imperative subject, wrapped body explaining why.

## Workflow

Each finished task lands as its own pull request:

1. Branch from an up-to-date `main` (never commit to `main` directly).
2. Make the change, including any `AGENTS.md` updates it calls for.
3. Run the CI line from [Commands](#commands).
4. Commit, push, and open a PR against `main` with `gh pr create`.
5. Watch the CI run (`gh pr checks --watch`) and fix it if it fails.
