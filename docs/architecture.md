# Browser Games — Architecture Draft

## Overview

A platform for creating fun, original browser games, inspired by the accessible
play and variety of sites like 4399. Existing games can inspire a genre or
theme; reproducing their mechanics, balance, or implementation is not a
requirement.

The platform will be hosted at **games.pufanyi.com**.

## Architecture

### Platform

- Built with **React + TypeScript**.
- Handles game discovery, navigation, game pages, and other platform features.
- Each game opens directly in the current browser tab.

### Games

- Games are independent web applications.
- **No restrictions on technology choices**: HTML, JavaScript, Canvas, WebGL,
  WASM, Phaser, Unity WebGL, etc.
- Each game provides a static build with an `index.html` entry point.
- Games should be playable independently of the platform.

### Game Navigation

- Catalog cards link directly to `/games/<slug>/` for published games.
- Games fill the browser viewport and own their responsive layout.
- No iframe or platform player surrounds the game; browser Back returns to the
  catalog.
- Legacy `/play/<slug>` links redirect to published games and show a coming-soon
  page for unbuilt games.
- Keep the game runtime independent of the platform.

## Design Principles

1. **Framework agnostic:** Developers can use any browser-compatible technology.
2. **Self-contained:** Games should run without relying on the platform.
3. **Simple deployment:** Upload a static game build to publish it.
4. **Minimal coupling:** Platform features should not interfere with game logic.

## Initial Scope

Focus on a simple game catalog, direct game navigation, and static game hosting.
Advanced features such as accounts, leaderboards, and multiplayer can be added
later.

## How this repo implements it

| Draft                       | Implementation                                                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform (React + TS)       | `platform/`: React pages rendered to HTML per request by `platform/app.tsx` and hydrated in the browser by `platform/client.tsx`. Vite builds the browser assets.                                                                   |
| Game catalog                | `/`, listing the games in `platform/games.ts`. A game counts as playable once its build is published.                                                                                                                               |
| Direct game navigation      | Catalog links to `/games/<slug>/` in the current tab. Legacy `/play/<slug>` URLs redirect for published games and show "Coming soon" for unbuilt games.                                                                             |
| Static game hosting         | `games/<slug>/` holds each game. `deno task build` publishes its static build to `dist/games/<slug>/`: the output of the game's own `build` task in `<game>/dist/`, or the folder as-is if it has none (`platform/game_builds.ts`). |
| Games playable on their own | Each game is served at `/games/<slug>/` with no platform code in it.                                                                                                                                                                |
| games.pufanyi.com           | Not configured yet; the Worker deploys under its default Cloudflare URL.                                                                                                                                                            |
