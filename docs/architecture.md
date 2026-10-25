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
Accounts and leaderboards can be added later. Online multiplayer is an optional
service; games retain their standalone single-player behavior.

## How this repo implements it

| Draft                       | Implementation                                                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform (React + TS)       | `platform/`: React pages rendered to HTML per request by `platform/app.tsx` and hydrated in the browser by `platform/client.tsx`. Vite builds the browser assets.                                                                   |
| Game catalog                | `/`, listing the games in `platform/games.ts`. A game counts as playable once its build is published.                                                                                                                               |
| Direct game navigation      | Catalog links to `/games/<slug>/` in the current tab. Legacy `/play/<slug>` URLs redirect for published games and show "Coming soon" for unbuilt games.                                                                             |
| Static game hosting         | `games/<slug>/` holds each game. `deno task build` publishes its static build to `dist/games/<slug>/`: the output of the game's own `build` task in `<game>/dist/`, or the folder as-is if it has none (`platform/game_builds.ts`). |
| Games playable on their own | Each game is served at `/games/<slug>/` with no platform code in it.                                                                                                                                                                |
| games.pufanyi.com           | Not configured yet; the Worker deploys under its default Cloudflare URL.                                                                                                                                                            |

## Optional multiplayer rooms

Gold Miner uses a host-authoritative cooperative mode. The host browser runs its
simulation; a guest sends commands and renders interpolated state snapshots. The
platform relays messages without importing any game simulation code.

- `POST /api/multiplayer/rooms` creates a room and returns its random ID and
  separate host credential. Invitations carry only the ID in the game URL's
  fragment.
- A same-origin WebSocket at `/api/multiplayer/rooms/<id>` connects each player
  to a `GameRoom` Durable Object. Its first message authenticates the host or
  reserves the guest seat. The service enforces roles, two seats, message sizes,
  rates and sequence ordering.
- `multiplayer/rooms.ts` owns the relay and expiry. `multiplayer/cloudflare.ts`
  describes the narrow Workers API boundary; `worker.ts` routes API requests
  before the static platform handler. These routes are not implemented by the
  standalone Deno server or Vite plugin.
- `wrangler.jsonc` binds `ROOMS` and declares the `v1-game-rooms` SQLite Durable
  Object migration. Wrangler provisions the namespace; no database, TURN server,
  account login or secret configuration is required. The binding is repeated
  under `previews`; each branch gets an isolated namespace and storage, per
  [Cloudflare's preview isolation rules](https://developers.cloudflare.com/workers/previews/resources/).
- Hibernation attachments retain socket roles and message counters. Durable
  storage holds credentials and room deadlines only. Game snapshots are never
  written to storage. Alarms expire rooms; connection recovery has a 30-second
  grace period, and rooms have a two-hour absolute lifetime.

Run `npx wrangler dev` for a complete local online game (it builds static assets
first). Open the game in two independent browser contexts and share its
generated link. Plain static hosting continues to support solo play; attempting
online play without the API displays an unavailable-service message.
