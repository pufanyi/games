# Gold Miner — design

A remake of the classic Flash game. The miner swings a claw from the top of the
screen, fires it to grab gold and gems, and has to hit a money goal before time
runs out. Check items off as they're built.

**Status:** single-player and online cooperative two-player are implemented.
Local two-player and competitive scoring are not implemented. Source is in
`src/`; `deno task dev` here runs it on its own with hot reload.

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
      skulls, barrels of TNT with a lit fuse, and moles that trundle back and
      forth with no visible path; buried items sit in a darker pocket of dirt
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
      a counter. The goods stand on it with paper price tags: a bundle of
      dynamite, a strength tonic, a four-leaf clover, a rock collector's book,
      and a jar of diamond polish. Pointing at or focusing one has him describe
      it in a speech bubble (and say how much you're short); buying makes him
      grin and stamps the item Sold
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
- [x] Fills its window and scales to it, opened directly at `/games/gold-miner/`

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

### Online co-op

The first online mode is cooperative. Competitive scoring can be added later as
an explicit mode; transport and room membership do not depend on scoring rules.

- [x] Two miners share one mine, money total, goal, dynamite inventory and
      boosts
- [x] The host controls the left miner; the guest controls the right miner
- [x] Both use Down / Space to fire, Up for dynamite, or touch controls
- [x] An item can only be grabbed once; same-tick ties go to the left miner
- [x] Either player presses Start in the room or Play again after a game over;
      both are already looking at the same screen, so there is no ready check
- [x] Both players ready before leaving the shop; shopping keeps readiness, and
      the button names the friend you are waiting for
- [x] Either player can buy shared upgrades; the host serializes purchases
- [x] Co-op results do not overwrite solo high scores

### Room and names

Keep the online UI to what two friends need: who is here, how to invite, and one
button to start.

- [x] Players have a display name, remembered in `localStorage`; first-timers
      get a random miner's name. Edit it in place on your room seat
- [x] The room shows two seats that mirror the left and right miners; an empty
      seat says "Waiting…" until a friend arrives
- [x] Only the host, and only while the second seat is empty, sees the invite
      link and its Copy button
- [x] Joining, returning and disconnecting show a named notice over the mine; a
      join also plays a chime
- [x] In game, a gold "You" tag marks your miner and your friend's name marks
      theirs
- [x] Pause names the friend you are waiting for after a disconnect

### Connection and synchronization

- [x] Host creates a room and shares an invitation URL; no account required
- [x] Names travel with the relay's join and presence messages, so seat changes
      arrive already named; names are 1–20 characters with no invisible or
      direction-changing characters
- [x] Guest opens the link to join; a third player gets a room-full message
- [x] Host runs the simulation at 60 ticks/s and publishes snapshots at 20 Hz
- [x] Guest sends commands; host assigns player identity from connection role
- [x] Guest interpolates continuous claw/item motion between snapshots
- [x] Protocol version, sequence numbers and round/level checks prevent stale
      commands from being applied to a different game or level
- [x] Pause is shared; hiding a tab pauses the game, and missing heartbeats also
      pause it. Resume is explicit after both players return
- [x] A transient socket disconnect pauses the game and reserves the same seat
      for 30 seconds. Reconnecting sends a full snapshot; no host migration
- [x] Leaving closes the room. Reloading loses credentials and the host's game;
      start a new room after a page refresh
- [x] Unjoined rooms expire after 15 minutes; all rooms expire after two hours

`src/runtime/online.ts` owns connection and host/guest behavior;
`src/runtime/protocol.ts` validates game messages and interpolates guest frames.
The game calls the optional same-origin `/api/multiplayer/rooms` service over
HTTP/WebSocket without importing platform code. Single-player remains available
without that service. Use `npx wrangler dev` to test online rooms locally; Vite
and the standalone Deno server only serve the single-player/static game.

The Cloudflare Worker uses one SQLite-backed Durable Object per room as a
message relay. It stores only room credentials and expiry, not game snapshots.
Hibernatable sockets retain role and rate/sequence metadata in attachments.
Invite URLs contain only a random room ID; host credentials are separate and
sent in the first WebSocket message, never in a URL. Messages are capped at 64
KiB and 60 messages per second per connection. This is friend-to-friend co-op:
the host is authoritative and is not protected against host cheating.

### Deferred

- [ ] Local two-player keyboard mode
- [ ] Selectable competitive mode with separate scores
- [ ] Host migration or recovery across page reloads
- [ ] Internet latency testing across player regions and mobile networks
