# Billiards — design

A pool game in the spirit of the Flash-era browser versions, with physics as
close to a real table as we can get. Two modes: a single-player race against the
clock to clear the table, and two-player 8-ball, on one device or online. Check
items off as they're built.

Single-player is built and playable; two-player isn't started.

## Modes

### Single-player: beat the clock

One rack against the clock (decided; a run of racks with shorter limits was the
alternative).

- [x] Rack all 15 object balls (an 8-ball rack, from a seed); pot them in any
      order before time runs out
- [x] The break: cue ball in hand behind the head string
- [x] One clock for the whole rack, 3 minutes (tune by playing); it keeps
      running while balls are moving. A shot rolling when it runs out still
      finishes, and wins if it clears the table
- [x] No 8-ball rules in this mode: any ball in any pocket counts, there is no
      calling pockets
- [x] Foul (scratch, missing every ball): costs 10s and gives ball in hand
      anywhere; a potted cue ball comes back on the head spot. Balls potted on a
      foul still count. (Balls can't leave the table, so there's no
      off-the-table foul.)
- [x] Clearing the table wins; the score is the time left. Best time in
      `localStorage`, wrapped in try/catch

### Two-player: 8-ball

Standard 8-ball, simplified where the full WPA rules only matter with a referee.

- [ ] Players are randomly picked to break. The break must pot a ball or drive
      at least four balls to a cushion, otherwise it's a foul
- [ ] Potting the 8 on the break: re-rack, and the same player breaks again
- [ ] The table is open after the break. The first player to legally pot a ball
      takes that group (solids 1–7 or stripes 9–15)
- [ ] A shot is legal when the cue ball hits one of the player's own balls first
      (any ball except the 8 while the table is open), and then a ball is potted
      or any ball touches a cushion
- [ ] Potting one of your own balls on a legal shot keeps your turn
- [ ] Fouls: scratch, cue ball off the table, wrong ball first, no ball hit, no
      cushion after contact, shot clock running out. The opponent gets ball in
      hand anywhere (behind the head string after a foul on the break)
- [ ] Potting the 8 legally after clearing your group wins. Potting it early, or
      on a foul, loses
- [ ] Shot clock (~45s, shown as a bar) so an online opponent can't stall
- [ ] **Decision:** do players have to call the pocket for the 8 (WPA rules), or
      does any pocket count (most Flash versions)?

## Physics

The goal is a table that behaves like a real one: draw, follow, stun, side spin
off the cushions, throw, swerve and massé. The model is the standard one from
pool physics literature, so there are published numbers to start from and known
results to test against.

References:

- Leckie and Greenspan, _An Event-Based Pool Physics Simulator_ (2006): the
  equations of motion for each ball state and the cue strike
- [pooltool](https://github.com/ekiefl/pooltool) (Evan Kiefl): an open-source
  simulator built on that model; its source and default parameters are the best
  reference implementation to read
- [Dr. Dave Alciatore's pool physics resources](https://billiards.colostate.edu/technical_proofs/):
  measured friction, restitution, throw and squirt, plus the classic results we
  test against
- Han, _Dynamics in Carom and Three Cushion Billiards_ (2005): cushion model

### What we model

Each ball has a position and velocity on the table plane and a full 3D angular
velocity. Balls stay on the slate: the first version has no jump shots or balls
flying off the table (see [Later](#later)).

- [x] **Ball states**, each with closed-form motion: stationary, spinning in
      place, sliding, rolling, pocketed
- [x] **Sliding**: the contact point slips on the cloth, and sliding friction
      both slows the ball and changes its spin until it rolls. This is what
      makes draw, follow and stun work
- [x] **Rolling**: rolling resistance slows the ball to a stop
- [x] **Spin about the vertical axis** (side spin) decays separately, and
      matters for cushions and throw
- [x] **Ball–ball**: nearly elastic, plus friction between the balls, which
      gives cut-induced and spin-induced throw (the object ball goes slightly
      off the line of centers)
- [x] **Ball–cushion**: the cushion nose is above the ball's center, so a
      cushion hit changes spin as well as speed; side spin changes the rebound
      angle (set up as in Han 2005: an impulse at the nose with friction)
- [x] **Cue strike**: the tip hits at an offset from the center (side spin,
      draw, follow) and at an elevation angle (swerve, massé). Side spin pushes
      the cue ball slightly off the aim line (squirt). Offsets past about half
      the ball's radius miscue
- [x] **Pockets**: the jaws are real geometry (straight cushion segments at
      WPA's jaw angles), so a ball can rattle in the jaws and stay out. A ball
      drops once its center is over the hole in the slate
- [ ] Rounded jaw points (they're sharp for now), if rattles look wrong
- [x] **Racking**: seeded tiny gaps between racked balls, as on a real table, so
      every break is different but replays exactly from its seed

### Starting values

From pooltool's defaults and Alciatore's measurements; tune by playing, and keep
them all in one `constants.ts`.

| Quantity                           | Value                   |
| ---------------------------------- | ----------------------- |
| Ball radius, mass                  | 28.575 mm, 170 g        |
| Table (9 ft) playing area          | 2.54 × 1.27 m           |
| Corner, side pocket mouth          | ~114 mm, ~129 mm        |
| Cushion nose height above slate    | ~63.5% of ball diameter |
| Cloth sliding friction             | 0.2                     |
| Cloth rolling resistance           | 0.01                    |
| Ball–ball restitution, friction    | 0.95, ~0.06             |
| Ball–cushion restitution, friction | 0.75, 0.2 (see below)   |
| Cue mass                           | ~570 g                  |
| Max cue ball speed (hard break)    | ~12 m/s                 |

Cushion restitution is lower than pooltool's 0.85 because with the nose above
the ball's center, topspin adds to the rebound: at 0.75, a rolling ball hit
straight in comes back at about 0.85 of its speed, which is what real cushions
do.

### Simulating a shot

A shot is fully decided the moment the cue hits the ball, so the whole shot is
simulated up front, then played back.

```ts
// src/physics/ — no DOM, no canvas, no Date.now(), no Math.random()
simulateShot(balls: Ball[], shot: Shot): ShotResult;
// Shot: { cue: [x, y, z] stroke direction (z < 0 is elevated), speed,
//         tip: [right, up] as fractions of the radius }
// ShotResult: { balls (at rest), events, frames, duration }
// events: ball–ball, ball–cushion, pocketed, in time order
```

- [x] Fixed substeps of 1 ms. Within a substep each ball moves along its exact
      closed-form path for its state. Collisions are found by treating motion
      within the substep as straight (the error is about 1 µm at the hardest
      deceleration) and solving for the contact time, then handled in time order
- [x] At 12 m/s a ball moves 1.2 cm per substep, under half its radius, so
      nothing tunnels through another ball or a cushion
- [x] Balls touching at exactly the same moment (frozen balls, the break) are
      handled one at a time in ball-number order, so the result is repeatable
- [x] The shot ends when every ball has stopped, with a cap on simulated time
- [x] Record frames (positions plus angular velocity) at 125 per second and at
      every collision for playback, and the event list for the rules
- [ ] A full shot simulates without a noticeable pause on a phone. A hard break
      takes 10–20 ms on a laptop; measure on a phone once there's a page to run,
      and if it's slow, add a uniform grid for broad-phase collision checks

A fully event-based simulator (pooltool's approach, solving polynomials for the
exact time of every collision) is exact, but its root solving is hard to make
robust. With 1 ms substeps and exact motion between them, the difference is far
below anything visible, so we start with substeps.

### Determinism

Both players' browsers must get the same result from the same shot, and the same
seed and shots must replay identically.

- [x] The simulation uses only `+ - * /` and `Math.sqrt`, which JavaScript
      computes identically everywhere. `Math.sin`, `cos`, `exp`, `atan2`,
      `hypot` and `pow` can differ in the last bit between browsers, and pool is
      chaotic enough that one bit changes the outcome after a few collisions. If
      a formula needs one of them, write our own approximation from arithmetic
- [x] The cue's direction is passed as a vector, so the trig that turns a mouse
      angle into it happens in the input code, outside the simulation
- [x] The seeded RNG lives in the state, never `Math.random()`
- [x] Ball orientation (for drawing numbers and stripes rolling) is integrated
      by the renderer from the recorded angular velocity, so it isn't part of
      the simulated state and can use trig

### Physics tests

`deno test` against results from the literature, so "realistic" is checked, not
eyeballed:

- [x] A sliding center-ball hit starts rolling at 5/7 of its starting speed
- [x] Stun shot, full hit: the cue ball stops dead
- [x] Stun shot, cut: the cue ball leaves along the tangent line (90° from the
      object ball), give or take throw
- [x] Rolling cue ball, half-ball hit: deflects about 30° (the 30° rule)
- [x] Draw comes back, follow goes through
- [x] Throw on a slow half-ball cut is a few degrees, in the direction Alciatore
      measures
- [x] Momentum is conserved in ball–ball hits and energy never increases
- [x] No tunneling at maximum speed
- [x] Same table and shot give bit-identical results

## Rules

The rules read the shot's event list and never touch physics.

```ts
// rules/
judge(state: GameState, result: ShotResult): Outcome;
// Outcome: foul?, ball in hand, groups, whose turn, winner, time penalty
```

- [x] `timed.ts`: the single-player rules, one pure function
- [ ] `eight_ball.ts`: the two-player rules
- [x] Each timed-mode rule has a test built from a hand-written event list, no
      physics needed

## Controls

- [x] Mouse: the cue follows the pointer; pull the power bar (right of the
      table) down and let go to shoot. The same bar works for touch, so there's
      one way to shoot rather than a separate drag-back on the table
- [x] Touch: drag on the table to aim, the power bar to shoot; fine-aim buttons
      under it
- [x] Keyboard: ← → aim (Shift for fine), ↑ ↓ strength, Enter shoots at the set
      strength, W A S D spin, M picks the cue ball up with ball in hand
- [x] Hold Space or the on-screen Hold button to charge from 0 to 100% over 1.5
      seconds; release to shoot. Maximum strength holds without firing. The
      numeric Strength indicator and cue pullback show the current charge
- [x] Charging locks aim, spin, and elevation. Pause, window blur, hidden tab,
      pointer cancellation, and timeout cancel the charge without shooting. Only
      the input that started a charge can release it
- [x] Dragging the strength bar remains available for precise shots. Strength is
      normalized player input; cue speed retains its quadratic mapping
- [x] Spin: a cue ball diagram where you place the tip, limited to the miscue
      radius; an elevation slider (0–60°) for swerve and massé. Both reset to a
      center hit with a level cue after each shot
- [x] Ball in hand: drag the cue ball (or arrow keys, Enter to place); positions
      overlapping a ball or outside the allowed area are refused
- [x] Aim line: from the cue ball to a ghost ball where it first makes contact,
      with a short line for the object ball's direction and a faint one for the
      cue ball's tangent line. It assumes no spin and no throw, like a real
      player's guess, so the physics still matters

## Screens and HUD

- [x] Screens: title, playing, pause, results (cleared or time's up)
- [ ] Mode select and online lobby, once two-player exists
- [x] HUD in single-player: time left (red under 30s), balls left, shots, the
      last foul, what to do next, and a tray of balls 1–15 lighting up as
      they're potted; best time on the title and results screens
- [ ] HUD in two-player: both players, their groups, whose turn, shot clock,
      ball in hand, the last foul and why
- [x] Pause automatically when the tab is hidden (`visibilitychange`); in
      single-player, the clock stops
- [x] Sound: cue strike, ball–ball clicks and cushion thuds with volume by
      impact speed, pocket drops; mute toggle (synthesized with Web Audio)
- [x] Works at phone width in landscape

## Rendering

Three.js renders the table in 3D (decided). The deterministic physics remains
plain TypeScript and does not depend on Three.js.

- [x] Perspective table view and an orthographic top view, switchable without
      changing aim or game state
- [x] Three-dimensional cloth, wooden rails, cushion noses, pockets, legs, and a
      tapered cue with ferrule and chalked tip
- [x] Ball meshes with original procedural numbered/striped textures, physically
      based materials, shadows, and generated environment reflections
- [x] Ball orientation follows recorded angular velocity; pocketed balls animate
      downward without affecting the physics result
- [x] Ray-to-plane pointer picking in both views, using the ball-center plane;
      mouse and touch coordinates stay correct when the stage scales
- [x] Shared table geometry: rendered cushion noses use the physical segments,
      and cloth cutouts use the physical pocket circles
- [x] Responsive drawing buffer capped at 2× device pixel ratio; GPU resources
      are disposed when the component unmounts
- [x] Graphics context loss pauses the game. Restoration rebuilds rendering
      resources; an unavailable 3D context shows a retry screen

Textures and models are generated locally, with no remote assets. Three.js is
pinned in this game's `deno.json`; its MIT license is bundled under
`public/licenses/three.txt` and copied into the published build.

## Technical

- [x] A standalone TypeScript app built with Vite: its own `deno.json` with a
      `build` task writing to `games/billiards/dist/` (see `AGENTS.md`)
- [x] Physics, rules and game flow in plain TS; Three.js draws the WebGL canvas;
      menus and HUD as React components that only re-render when what they show
      changes (never every frame)
- [x] A 16:9 stage with a 1280 × 720 reference layout and a responsive WebGL
      drawing buffer; fills its window, since it runs in the platform's iframe
      and must also work opened directly at `/games/billiards/`
- [x] Playback uses `requestAnimationFrame`, interpolating between recorded
      frames by real time, so it looks the same at any frame rate

```
games/billiards/src/
  physics/      constants, table geometry, motion, collisions, cue, seeded RNG
  rules/        timed.ts (eight_ball.ts later)
  game/         game state, shot playback, and aim-guide calculations
  runtime/      session actions, browser keyboard bindings, audio, storage
  rendering/    Three.js renderer, cameras, meshes, textures, reference layout
  ui/           screens, controls, CSS, canvas host and renderer lifecycle hook
  main.tsx      browser entry point
```

Unit tests stay beside the module they exercise, for example `game/game.ts` and
`game/game_test.ts`. Production entry points never import test modules. The UI
owns renderer lifetime and browser bindings; physics, rules, and game logic have
no React, Three.js, or browser dependencies.

## Multiplayer

**On hold.** Single-player comes first, and multiplayer will be designed again
before it's built; the notes below are only a starting point.

Build in this order.

### 1. Local two-player (no network)

- [ ] Players take turns on one device; whoever's turn it is uses the controls
- [ ] Turn flow, fouls and winning all work before any networking exists

### 2. Online

Pool is turn-based, which makes online play much easier than in a real-time
game: only one player acts at a time, and a whole shot is one small message.

- [ ] **Decision:** transport. Same choice as Gold Miner (see the options table
      in `games/gold-miner/DESIGN.md`): a WebSocket relay on the platform's
      Worker (most reliable), or Trystero over WebRTC (stays a static site). It
      should be one answer for both games

**Sharing state:** the player who created the room is the host and its results
are final.

- [ ] While aiming, the shooter sends the aim and power ~10 times a second, so
      the opponent watches the cue move
- [ ] The shot is sent as its parameters (well under 200 bytes). Both browsers
      simulate it and play it back at once, with no waiting on the network
- [ ] The host then sends the final ball positions and the rules outcome. They
      almost always already match (see [Determinism](#determinism)); if not, the
      guest snaps to the host's and the mismatch is logged as a bug
- [ ] The whole game state is small (16 balls plus the rules state), so a
      reconnecting player gets one snapshot and carries on

**Online-only details:**

- [ ] Room code or link to invite the other player
- [ ] Who breaks is drawn from the host's seeded RNG
- [ ] Disconnect: pause and wait (~60s) for the player to come back, then the
      remaining player wins
- [ ] No anti-cheat: the host could lie about results. Fine for a museum; if it
      matters later, the Worker can run the same `simulateShot` and be the
      referee

## Later

Not in the first version, but nothing above should rule them out:

- Jump shots and balls leaving the table (adds vertical motion and the slate as
  a surface)
- A computer opponent: the up-front simulation lets it try many shots and pick
  the best
- Other games on the same physics: 9-ball, snooker, carom
- Replays, from the seed and the list of shots
