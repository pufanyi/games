# Gold Miner — design

A remake of the classic Flash game. The miner swings a claw from the top of the
screen, fires it to grab gold and gems, and has to hit a money goal before time
runs out. Check items off as they're built.

Not built yet: until it publishes a build, the catalog shows this game as
"Coming soon".

## Core loop

- [ ] Claw swings like a pendulum, about ±70° from straight down, at a constant
      angular speed
- [ ] Firing extends the claw in a straight line at the current angle
- [ ] On hitting an item, the claw grabs it and reels back; heavier items reel
      back more slowly (roughly `baseSpeed / weight`)
- [ ] A miss returns empty when the claw reaches the edge of the screen
- [ ] Ignore input while the claw is out, except dynamite
- [ ] When the claw gets back, the item's value is added to the money total
- [ ] Each level has a timer (~60s) and a money goal: meet it to go to the shop,
      miss it and the game is over
- [ ] Items left when time runs out are lost

## Items in the mine

Relative values only; pick numbers and tune them by playing.

| Item                        | Value       | Weight              | Notes                                        |
| --------------------------- | ----------- | ------------------- | -------------------------------------------- |
| Gold (small, medium, large) | Low to high | Light to very heavy | Large gold is the risky grab                 |
| Rock (small, large)         | Very low    | Heavy               | Wastes time                                  |
| Diamond                     | Very high   | Very light          | Rare                                         |
| Mystery bag                 | Random      | Light               | Money, a free dynamite, or a strength boost  |
| Mole or pig                 | Low         | Light               | Walks back and forth; some carry a diamond   |
| TNT barrel                  | 0           | –                   | Explodes when grabbed, destroys nearby items |
| Bone or skull               | Very low    | Light               | Clutter                                      |

## Levels

- [ ] The money goal rises every level
- [ ] Levels are hand-designed or generated with a **seeded** RNG (same seed,
      same mine), with no overlapping items and valuable items placed deeper

## Shop between levels

A random selection at random prices on each visit:

- [ ] **Dynamite**: use while reeling back to destroy what you're holding
- [ ] **Strength drink**: reel back faster next level
- [ ] **Lucky clover**: better mystery bags
- [ ] **Rock collector's book**: rocks are worth more
- [ ] **Diamond polish**: diamonds are worth more

## Controls

- [ ] Keyboard: Down or Space fires, Up uses dynamite
- [ ] Mouse or touch: tap to fire, plus an on-screen dynamite button
- [ ] Works at phone width

## Screens and HUD

- [ ] Screens: title, playing, pause, level cleared, shop, game over
- [ ] HUD: money, goal, time left, level, dynamite count
- [ ] Pause automatically when the tab is hidden (`visibilitychange`)
- [ ] High score in `localStorage`, wrapped in try/catch
- [ ] Sound: firing, reel-back loop, grabs, explosions, cash register; mute
      toggle

## Technical

- [ ] Canvas 2D at a fixed internal resolution, scaled to fit the screen
- [ ] `requestAnimationFrame` for drawing over a **fixed-timestep** update (e.g.
      60 ticks/s), so the physics is the same at any frame rate
- [ ] A standalone TypeScript app built with Vite: its own `deno.json` with a
      `build` task writing to `games/gold-miner/dist/` (see `AGENTS.md`)
- [ ] Game logic and canvas drawing in plain TS; title, pause, shop, and
      game-over screens as React components over the canvas, which only
      re-render when what they show changes (never every frame)
- [ ] Fills its window and scales to it, since it runs in the platform's iframe
      and must also work opened directly at `/games/gold-miner/`

### Keep the game logic separate from the screen

Do this from the start, even for single-player. It makes local and online
multiplayer a matter of where the inputs come from.

```ts
// sim.ts — no DOM, no canvas, no Date.now(), no Math.random()
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
