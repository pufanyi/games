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
  No Node, npm, or build step.
- Server: `Deno.serve` + `serveDir` from `@std/http`. Pages are rendered as HTML
  strings in `views.ts`; there is no framework.
- The Deno agent skill lives in `.agents/skills/deno` (symlinked into
  `.claude/skills/deno`, pinned in `skills-lock.json`). For version-accurate CLI
  details, prefer `deno <cmd> --help`.

## Layout

```
main.ts          request routing: /, /static/*, /games/<slug>/...
views.ts         HTML rendering (landing, coming-soon, 404) + escapeHtml
games.ts         game registry (slug, title, description, tags)
static/          landing page CSS and JS (grid/list toggle, search)
games/<slug>/    one self-contained static folder per game
main_test.ts     handler tests
```

## Commands

```sh
deno task dev     # server on http://localhost:8000 with --watch
deno task start   # server without watch
deno task test    # tests (needs --allow-read=., set in the task)
deno fmt && deno lint && deno check main.ts main_test.ts
```

Run fmt, lint, check, and test before calling a task done.

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

## Conventions

- Permissions stay scoped: `--allow-net --allow-read=.`. Don't switch tasks to
  `-A`; add the specific `--allow-*` flag a new feature needs.
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
3. Run fmt, lint, check, and test.
4. Commit, push, and open a PR against `main` with `gh pr create`.
