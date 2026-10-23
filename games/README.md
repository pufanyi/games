# Games

Each folder here is an independent web app, written in any browser technology.
The platform embeds its static build in an iframe at `/play/<slug>`, and serves
it on its own at `/games/<slug>/`.

A game either:

- is a static site with an `index.html`, published as-is, or
- has a `build` task in its own `deno.json` (or a `build` script in its
  `package.json`) that writes a static build with an `index.html` to
  `games/<slug>/dist/`.

To add a game:

1. Add an entry to `platform/games.ts` with a matching `slug` and the game's
   `aspectRatio`.
2. Create `games/<slug>/` as above.

Until the build has an `index.html`, the catalog shows the game as "Coming
soon". Use relative paths for assets (e.g. `./game.js`) so the game works at
`/games/<slug>/`, and don't import anything from `platform/`. See
[`AGENTS.md`](../AGENTS.md) and
[`docs/architecture.md`](../docs/architecture.md) for the full conventions.
