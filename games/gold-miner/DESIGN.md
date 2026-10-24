# Gold Miner — design

A remake of the classic Flash game. The miner swings a claw from the top of the
screen, fires it to grab gold and gems, and has to hit a money goal before time
runs out. Check items off as they're built.

**Status:** v1 is single-player and complete: everything above
[Multiplayer](#multiplayer) is built. Rules, geometry, and timing follow values
recovered from the original file (see [CALIBRATION.md](CALIBRATION.md)); art,
sound, and text are new. Source is in `src/`; `deno task dev` here runs it on
its own with hot reload.

## Core loop

- [x] The claw swings from about +67° to −68° and back on the original's
      measured per-frame rotation table, looping over its 84 keys
- [x] Firing extends the claw in a straight line at the current angle; the swing
      keeps turning while the claw is out, as in the original
- [x] On hitting an item, the rope snaps to the matching retract key frame and
      reels back; the reel rate is `minerStrength - weight` clip frames per
      frame, so heavy items crawl and empty shots return fast
- [x] A miss returns empty once extension reaches its measured maximum
- [x] Ignore input while the claw is out, except dynamite while reeling
- [x] When the claw gets back, the item's value is added to the money total
- [x] Each level has a 60-second timer and a money goal: meet it to go to the
      shop, miss it and the game is over
- [x] Items left when time runs out are lost; a cash payout still in progress
      delays the end instead of cancelling it

## Items in the mine

Values and weights are the original's object table; hit boxes and drawn sizes
are its recovered sprite bounds. See [CALIBRATION.md](CALIBRATION.md) for how
each number was read.

| Item                              | Value  | Weight | Notes                                        |
| --------------------------------- | ------ | ------ | -------------------------------------------- |
| Gold (small, medium, large, huge) | 50–500 | 3–9    | Larger gold is worth more and hauls slower   |
| Rock (small, large)               | 11, 20 | 8, 9   | Heavy for almost nothing                     |
| Diamond                           | 600    | 2      | Rare; polish raises it to 900                |
| Pig                               | 602    | 5      | Walks; polish raises it to 902               |
| Mole                              | 2      | 3      | Walks; some carry a diamond                  |
| Mystery bag                       | Rolled | 1–9/−1 | Money, temporary strength, or dynamite       |
| Bone / skull                      | 7, 20  | 3, 2   | Clutter                                      |
| TNT barrel                        | 1      | 2      | Explodes when grabbed, destroying neighbours |

## Levels

- [x] 30 fixed layouts, 10 themes × 3 variants, recovered from the original
- [x] The money goal follows the original ladder from 650 upward
- [x] Pigs and moles patrol their tunnel with measured walk speeds and pauses
- [x] Bags, diamonds, rocks, and TNT are placed and rolled as in the original

## Shop between levels

Five fixed slots; an out-of-stock slot is simply empty, and stock and prices are
rolled with the original's own rules:

- [x] **Dynamite**: use while reeling back to destroy what you're holding,
      damage nearby items, and trigger nearby TNT; never stocked at five sticks
- [x] **Strength drink**: reel back faster next level
- [x] **Lucky clover**: better mystery bags (and more dynamite from them)
- [x] **Rock collector's book**: rocks are worth three times as much
- [x] **Diamond polish**: diamonds and pigs are worth 300 more
- [x] Buying is never blocked by the money total, which can go negative

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
(no image files): Canvas 2D in the mine, inline SVG in the React screens (both
use the same `INK` outline). Keep new art consistent with it:

- [x] **Ink outlines** on every sprite (`INK` in `src/rendering/paint.ts`, about
      2px), over a gradient body lit from the top left, with a glossy highlight
- [x] **Palette:** golden-hour sky, terracotta mesas, sienna-to-umber dirt
      strata, warm gold, cool cyan diamonds, wood browns for UI
- [x] **Scenery** (`src/rendering/scenery.ts`): sky with sun and drifting
      clouds, mesas, saguaro cacti, layered dirt with speckles, pebbles, roots,
      and two hidden fossils; static layers are painted once into offscreen
      canvases
- [x] **Sprites** (`src/rendering/sprites.ts`): pitted gold with twinkles,
      chipped and cracked rocks, glowing cut diamonds, patched sacks, bones and
      skulls, barrels of TNT with a lit fuse, and moles and pigs that trundle
      along their tunnels; buried items sit in a darker pocket of dirt
- [x] **Camp** (`src/rendering/camp.ts`): a plank deck over the shaft, a rope
      reel on two trestles whose coil grows as the rope comes in, and an ore
      cart whose heap of gold grows toward the level's goal
- [x] **Miner:** a stout, bearded prospector in a hard hat and plaid shirt,
      turning the reel's crank with both hands (two-bone arms that follow the
      crank). His face reacts: blinks at rest, strains and sweats hauling heavy
      loads, grins at a good payout, frowns at a poor one
- [x] **Claw** (`src/rendering/claw.ts`): a steel grab with the rope's end bound
      in twine through a D-shackle, a bevelled housing with rivets and a brass
      pivot bolt, a third prong behind, and two hooked jaws with teeth, a bevel,
      and darkened tips. The jaws pivot shut around a catch, which is drawn
      between the back prong and the jaws so it sits in their grip
- [x] **Effects:** popping money text; explosions with a flash, shock ring,
      smoke, and debris
- [x] **HUD:** wooden signboards with coin and clock icons, boost tags, and
      dynamite sticks on the platform
- [x] **Screens:** parchment panels in a wooden frame, chunky gold buttons that
      press down, and the title in gold with an ink outline between a nugget and
      a diamond
- [x] **Shop** (`src/ui/screens.tsx`, art in `src/ui/art.tsx`): a general store
      whose storekeeper (eyeshade, spectacles, handlebar mustache) stands behind
      a counter. The goods stand on it in five fixed spots with paper price
      tags: a bundle of dynamite, a strength tonic, a four-leaf clover, a rock
      collector's book, and a jar of diamond polish. An out-of-stock spot stays
      empty. Pointing at or focusing an item has him describe it in a speech
      bubble; buying makes him grin and stamps the item Sold
- [x] **Font:** Lilita One (SIL Open Font License), bundled in `src/fonts/` with
      its license so the game works offline

## Technical

- [x] Canvas 2D at a fixed internal resolution, scaled to fit the screen
- [x] `requestAnimationFrame` for drawing over a **fixed-timestep** update at 60
      ticks/s, advancing the original's 18 fps clip timelines by 0.3 frames per
      tick, so motion is smooth and timing matches at any display rate
- [x] A standalone TypeScript app built with Vite: its own `deno.json` with a
      `build` task writing to `games/gold-miner/dist/` (see `AGENTS.md`)
- [x] Game logic and canvas drawing in plain TS; title, pause, shop, and
      game-over screens as React components over the canvas, which only
      re-render when what they show changes (never every frame)
- [x] Fills its window and scales to it, since the platform opens it directly at
      `/games/gold-miner/` in the current tab

### Source boundaries

- `src/game/`: simulation, recovered original tables (`original.ts`), and the 30
  fixed layouts (`layouts.ts`); tuning lives in `config.ts`, item denominations
  and boxes in `items.ts`, and shop rules in `shop.ts`.
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
// inputs: [{ player: 0, action: "fire" | "dynamite" | "buy" | "continue" }]
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
