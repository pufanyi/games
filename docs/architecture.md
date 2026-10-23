# Web Game Museum — Architecture Draft

## Overview

A browser-based platform for preserving and recreating classic web games,
inspired by sites like 4399.

The platform will be hosted at **games.pufanyi.com**.

## Architecture

### Platform

- Built with **React + TypeScript**.
- Handles game discovery, navigation, game pages, and other platform features.
- Each game runs inside an embedded game window.

### Games

- Games are independent web applications.
- **No restrictions on technology choices**: HTML, JavaScript, Canvas, WebGL,
  WASM, Phaser, Unity WebGL, etc.
- Each game provides a static build with an `index.html` entry point.
- Games should be playable independently of the platform.

### Game Embedding

- Use **iframe** to embed games within the React platform.
- Games can be hosted under paths such as `games.pufanyi.com/games/gold-miner/`.
- Support fullscreen mode and responsive scaling.
- Keep the game runtime independent of React.

### Optional Platform Integration

Games may communicate with the platform through `postMessage` for features such
as:

- High scores and leaderboards
- Save data
- Multiplayer rooms
- Fullscreen controls

These integrations are optional.

## Design Principles

1. **Framework agnostic:** Developers can use any browser-compatible technology.
2. **Self-contained:** Games should run without relying on the platform.
3. **Simple deployment:** Upload a static game build to publish it.
4. **Minimal coupling:** Platform features should not interfere with game logic.

## Initial Scope

Focus on a simple game catalog, embedded game player, and static game hosting.
Advanced features such as accounts, leaderboards, and multiplayer can be added
later.

## How this repo implements it

| Draft                       | Implementation                                                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform (React + TS)       | `platform/`: React pages rendered to HTML per request by `platform/app.tsx` and hydrated in the browser by `platform/client.tsx`. Vite builds the browser assets.                                                                   |
| Game catalog                | `/`, listing the games in `platform/games.ts`. A game counts as playable once its build is published.                                                                                                                               |
| Embedded game player        | `/play/<slug>`: an iframe of `/games/<slug>/`, scaled to the game's `aspectRatio`, with a fullscreen button and a link to open the game on its own. Shows "Coming soon" until the game is built.                                    |
| Static game hosting         | `games/<slug>/` holds each game. `deno task build` publishes its static build to `dist/games/<slug>/`: the output of the game's own `build` task in `<game>/dist/`, or the folder as-is if it has none (`platform/game_builds.ts`). |
| Games playable on their own | Each game is served at `/games/<slug>/` with no platform code in it.                                                                                                                                                                |
| `postMessage` integration   | Not built yet.                                                                                                                                                                                                                      |
| games.pufanyi.com           | Not configured yet; the Worker deploys under its default Cloudflare URL.                                                                                                                                                            |
