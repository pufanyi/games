# Gold Miner — design

A remake of the classic Flash game. The miner swings a claw from the top of the
screen, fires it to grab gold and gems, and has to hit a money goal before time
runs out. Check items off as they're built.

**Status:** v1 is single-player and complete: everything above
[Multiplayer](#multiplayer) is built. Source is in `src/`; `deno task dev` here
runs it on its own with hot reload.

## Core loop

- [x] Claw swings like a pendulum, about ±70° from straight down, at a constant
      angular speed
- [x] Firing extends the claw in a straight line at the current angle
- [x] On hitting an item, the claw grabs it and reels back; heavier items reel
      back more slowly (roughly `baseSpeed / weight`)
- [x] A miss returns empty when the claw reaches the edge of the screen
- [x] Ignore input while the claw is out, except dynamite
- [x] When the claw gets back, the item's value is added to the money total
- [x] Each level has a timer (~60s) and a money goal: meet it to go to the shop,
      miss it and the game is over
- [x] Items left when time runs out are lost

## Items in the mine

Match the classic single-player game where historical evidence is available. See
[CALIBRATION.md](CALIBRATION.md) for supported values, estimates, and remaining
differences.

| Item                              | Value             | Weight              | Notes                                        |
| --------------------------------- | ----------------- | ------------------- | -------------------------------------------- |
| Gold (small, medium, large, huge) | 50, 100, 250, 500 | Light to very heavy | Large gold is the risky grab                 |
| Rock (small, large)               | Very low          | Heavy               | Wastes time                                  |
| Diamond                           | Very high         | Very light          | Rare                                         |
| Mystery bag                       | Random            | Variable            | Money, a free dynamite, or a strength boost  |
| Mole or pig                       | Low               | Light               | Walks back and forth; some carry a diamond   |
| TNT barrel                        | 0                 | –                   | Explodes when grabbed, destroys nearby items |
| Bone or skull                     | Very low          | Light               | Clutter                                      |

## Levels

- [x] The money goal rises every level
- [x] Levels are hand-designed or generated with a **seeded** RNG (same seed,
      same mine), with no overlapping items and valuable items placed deeper

## Shop between levels

A random selection at random prices on each visit:

- [x] **Dynamite**: use while reeling back to destroy what you're holding,
      damage nearby items, and trigger nearby TNT
- [x] **Strength drink**: reel back faster next level
- [x] **Lucky clover**: better mystery bags
- [x] **Rock collector's book**: rocks are worth more
- [x] **Diamond polish**: diamonds are worth more

## Controls

- [x] Keyboard: Down or Space fires, Up uses dynamite
- [x] Mouse or touch: tap to fire, plus an on-screen dynamite button
- [x] Works at phone width

## Screens and HUD

- [x] Screens: title, playing, pause, level cleared, shop, game over
- [x] HUD: money, goal, time left, level, dynamite count
- [x] Pause automatically when the tab is hidden (`visibilitychange`)
- [x] High score in `localStorage`, wrapped in try/catch
- [x] Sound: firing, reel-back loop, grabs, explosions, cash register; mute
      toggle

## Art direction

Cartoon vector art in the style of classic Flash games, drawn entirely in code
(no image files). Keep new art consistent with it:

- [x] **Ink outlines** on every sprite (`INK` in `src/rendering/paint.ts`, about
      2px), over a gradient body lit from the top left, with a glossy highlight
- [x] **Palette:** golden-hour sky, terracotta mesas, sienna-to-umber dirt
      strata, warm gold, cool cyan diamonds, wood browns for UI
- [x] **Scenery** (`src/rendering/scenery.ts`): sky with sun and drifting
      clouds, mesas, layered dirt with speckles, pebbles, roots, and two hidden
      fossils; static layers are painted once into offscreen canvases
- [x] **Sprites** (`src/rendering/sprites.ts`): faceted gold with twinkles,
      cracked rocks, cut diamonds, tied sacks, barrels of TNT with a lit fuse,
      and moles; buried items sit in a darker pocket of dirt
- [x] **Miner and winch** (`src/rendering/render.ts`): a bearded prospector in a
      hard hat turning a crank, belted to a pulley on an A-frame
- [x] **Effects:** popping money text; explosions with a flash, shock ring,
      smoke, and debris
- [x] **HUD:** wooden signboards with coin and clock icons, boost tags, and
      dynamite sticks on the platform
- [x] **Screens:** parchment panels in a wooden frame, chunky gold buttons that
      press down, and the title in gold with an ink outline
- [x] **Font:** Lilita One (SIL Open Font License), bundled in `src/fonts/` with
      its license so the game works offline

## Technical

- [x] Canvas 2D at a fixed internal resolution, scaled to fit the screen
- [x] `requestAnimationFrame` for drawing over a **fixed-timestep** update (e.g.
      60 ticks/s), so the physics is the same at any frame rate
- [x] A standalone TypeScript app built with Vite: its own `deno.json` with a
      `build` task writing to `games/gold-miner/dist/` (see `AGENTS.md`)
- [x] Game logic and canvas drawing in plain TS; title, pause, shop, and
      game-over screens as React components over the canvas, which only
      re-render when what they show changes (never every frame)
- [x] Fills its window and scales to it, since it runs in the platform's iframe
      and must also work opened directly at `/games/gold-miner/`

### Source boundaries

- `src/game/`: simulation and seeded level generation; tuning lives in
  `config.ts`, item denominations and weights in `items.ts`, shop rules in
  `shop.ts`.
- `src/rendering/`: Canvas-only presentation.
- `src/runtime/`: browser session, audio, and persistence.
- `src/ui/`: React overlays, input/Canvas host, and styles.
- `src/main.tsx`: browser entry; `src/fonts/`: licensed font assets.

### Keep the game logic separate from the screen

Do this from the start, even for single-player. It makes local and online
multiplayer a matter of where the inputs come from.

```ts
// src/game/sim.ts — no DOM, no canvas, no Date.now(), no Math.random()
export function createGame(seed: number): GameState; // plain, JSON-serializable
export function step(state: GameState, inputs: Input[]): void; // one fixed tick
// inputs: [{ player: 0, action: "fire" | "dynamite" }]
```

- `step` depends only on `state` and `inputs`
- The seeded RNG lives inside the state
- Rendering and input handling are separate modules that read the state and
  produce inputs

## Multiplayer

Build in this order.

### 1. Local two-player (no network)

The original had a two-player mode on one screen: two miners side by side, each
with their own claw.

- [ ] Player 1 uses ↓ and ↑, player 2 uses S and W
- [ ] When both claws grab the same item, the earlier grab wins
- [ ] **Decision:** players compete for separate scores, or share one goal?

### 2. Online

Two browsers can't find each other without some third party.

| Option                                                       | Truly no backend?               | Reliability | Notes                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------ | ------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WebRTC through [Trystero](https://github.com/dmotz/trystero) | Yes                             | Fair        | Peers find each other through free public services (BitTorrent trackers, Nostr and similar), then connect directly. Some networks block direct connections without a relay (TURN) server.                                                                          |
| PeerJS                                                       | Uses PeerJS's free cloud server | Fair        | Simpler API; depends on a hosted service you don't control                                                                                                                                                                                                         |
| WebSocket relay on the platform                              | No                              | Best        | Rooms that pass messages along, run by the platform's Cloudflare Worker (likely a Durable Object). A platform feature, so the game uses it only through the optional platform integration in `docs/architecture.md`, and must still work single-player without it. |
| `BroadcastChannel`                                           | Yes                             | –           | Same browser only; useful for testing with two tabs                                                                                                                                                                                                                |

- [ ] **Decision:** WebSocket relay (recommended, most reliable) or Trystero
      (stays a static site)?

**Sharing state:** one player is the host.

- [ ] Host runs `step()` and sends a state snapshot ~15–20 times a second (about
      30 items plus two claws)
- [ ] The other player sends only inputs and smooths motion between snapshots
- [ ] Avoid lockstep (each player simulating, exchanging only inputs) for the
      first version: `Math.sin`/`Math.cos` can differ slightly between browsers,
      and the swing angle depends on them, so players drift out of sync

**Online-only details:**

- [ ] Shop phase: both players click "ready" before the next level starts
- [ ] Room code or link to invite the other player
- [ ] Message when a player disconnects (no host migration)
