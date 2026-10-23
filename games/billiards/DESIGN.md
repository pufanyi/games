# Billiards — design

A pool game in the spirit of the Flash-era browser versions, with physics as
close to a real table as we can get. Two modes: a single-player race against the
clock to clear the table, and two-player 8-ball, on one device or online. Check
items off as they're built.

Not built yet: until it publishes a build, the catalog shows this game as
"Coming soon".

## Modes

### Single-player: beat the clock

- [ ] Rack all 15 object balls; pot them in any order before time runs out
- [ ] One clock for the whole rack (start around 3 minutes and tune by playing);
      it keeps running while balls are moving
- [ ] No 8-ball rules in this mode: any ball in any pocket counts, there is no
      calling pockets
- [ ] Foul (scratch, cue ball off the table, missing every ball): costs time
      (~10s) and gives ball in hand anywhere
- [ ] Clearing the table wins; the score is the time left. Best time in
      `localStorage`, wrapped in try/catch
- [ ] **Decision:** is it one rack against the clock, or a run of racks where
      each one's time limit is shorter (and potting a ball adds a few seconds)?

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

- [ ] **Ball states**, each with closed-form motion: stationary, spinning in
      place, sliding, rolling, pocketed
- [ ] **Sliding**: the contact point slips on the cloth, and sliding friction
      both slows the ball and changes its spin until it rolls. This is what
      makes draw, follow and stun work
- [ ] **Rolling**: rolling resistance slows the ball to a stop
- [ ] **Spin about the vertical axis** (side spin) decays separately, and
      matters for cushions and throw
- [ ] **Ball–ball**: nearly elastic, plus friction between the balls, which
      gives cut-induced and spin-induced throw (the object ball goes slightly
      off the line of centers)
- [ ] **Ball–cushion**: the cushion nose is above the ball's center, so a
      cushion hit changes spin as well as speed; side spin changes the rebound
      angle (Han 2005)
- [ ] **Cue strike**: the tip hits at an offset from the center (side spin,
      draw, follow) and at an elevation angle (swerve, massé). Side spin pushes
      the cue ball slightly off the aim line (squirt). Offsets past about half
      the ball's radius miscue
- [ ] **Pockets**: the jaws are real geometry (straight cushion segments ending
      in rounded points), so a ball can rattle in the jaws and stay out. A ball
      drops once its center crosses the pocket opening
- [ ] **Racking**: seeded tiny gaps between racked balls, as on a real table, so
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
| Ball–cushion restitution, friction | 0.85, 0.2               |
| Cue mass                           | ~570 g                  |
| Max cue ball speed (hard break)    | ~12 m/s                 |

### Simulating a shot

A shot is fully decided the moment the cue hits the ball, so the whole shot is
simulated up front, then played back.

```ts
// physics/ — no DOM, no canvas, no Date.now(), no Math.random()
simulateShot(table: TableState, shot: Shot): ShotResult;
// Shot: { aim: [x, y] unit vector, speed, tipOffset: [side, height], elevation }
// ShotResult: { frames, events, final: TableState }
// events: ball–ball, ball–cushion, pocketed, in time order
```

- [ ] Fixed substeps of 1 ms. Within a substep each ball moves along its exact
      closed-form path for its state. Collisions are found by treating motion
      within the substep as straight (the error is about 1 µm at the hardest
      deceleration) and solving for the contact time, then handled in time order
- [ ] At 12 m/s a ball moves 1.2 cm per substep, under half its radius, so
      nothing tunnels through another ball or a cushion
- [ ] Balls touching at exactly the same moment (frozen balls, the break) are
      handled one at a time in ball-number order, so the result is repeatable
- [ ] The shot ends when every ball has stopped, with a cap on simulated time
- [ ] Record frames (positions plus angular velocity) at 120 per second for
      playback, and the event list for the rules
- [ ] A full shot simulates in well under a frame's time on a phone; if the
      break is slow, add a uniform grid for broad-phase collision checks

A fully event-based simulator (pooltool's approach, solving polynomials for the
exact time of every collision) is exact, but its root solving is hard to make
robust. With 1 ms substeps and exact motion between them, the difference is far
below anything visible, so we start with substeps.

### Determinism

Both players' browsers must get the same result from the same shot, and the same
seed and shots must replay identically.

- [ ] The simulation uses only `+ - * /` and `Math.sqrt`, which JavaScript
      computes identically everywhere. `Math.sin`, `cos`, `exp`, `atan2`,
      `hypot` and `pow` can differ in the last bit between browsers, and pool is
      chaotic enough that one bit changes the outcome after a few collisions. If
      a formula needs one of them, write our own approximation from arithmetic
- [ ] The aim is passed as a unit vector, so the trig that turns a mouse angle
      into it happens in the input code, outside the simulation
- [ ] The seeded RNG lives in the state, never `Math.random()`
- [ ] Ball orientation (for drawing numbers and stripes rolling) is integrated
      by the renderer from the recorded angular velocity, so it isn't part of
      the simulated state and can use trig

### Physics tests

`deno test` against results from the literature, so "realistic" is checked, not
eyeballed:

- [ ] A sliding center-ball hit starts rolling at 5/7 of its starting speed
- [ ] Stun shot, full hit: the cue ball stops dead
- [ ] Stun shot, cut: the cue ball leaves along the tangent line (90° from the
      object ball), give or take throw
- [ ] Rolling cue ball, half-ball hit: deflects about 30° (the 30° rule)
- [ ] Draw comes back, follow goes through
- [ ] Throw on a slow half-ball cut is a few degrees, in the direction Alciatore
      measures
- [ ] Momentum is conserved in ball–ball hits and energy never increases
- [ ] No tunneling at maximum speed
- [ ] Same table and shot give bit-identical results

## Rules

The rules read the shot's event list and never touch physics.

```ts
// rules/
judge(state: GameState, result: ShotResult): Outcome;
// Outcome: foul?, ball in hand, groups, whose turn, winner, time penalty
```

- [ ] One pure function per mode: `eightBall.ts`, `timed.ts`
- [ ] Each rule from [Modes](#modes) has a test built from a hand-written event
      list, no physics needed

## Controls

- [ ] Mouse: the cue follows the pointer around the cue ball; press and drag
      back to set power, release to shoot
- [ ] Touch: drag on the table to aim, a power slider at the side; fine-aim
      buttons
- [ ] Keyboard: ← → aim (Shift for fine), ↑ ↓ power, Space shoots
- [ ] Spin: a cue ball diagram where you place the tip, limited to the miscue
      radius; an elevation slider for swerve and massé
- [ ] Ball in hand: drag the cue ball; positions overlapping a ball or outside
      the allowed area are refused
- [ ] Aim line: from the cue ball to a ghost ball where it first makes contact,
      with a short line for the object ball's direction. It assumes no spin and
      no throw, like a real player's guess, so the physics still matters

## Screens and HUD

- [ ] Screens: title (mode select), playing, pause, game over / results, online
      lobby
- [ ] HUD in single-player: time left, balls left, best time
- [ ] HUD in two-player: both players, their groups, whose turn, shot clock,
      ball in hand, the last foul and why
- [ ] Pause automatically when the tab is hidden (`visibilitychange`); in
      single-player, the clock stops
- [ ] Sound: cue strike, ball–ball clicks and cushion thuds with volume by
      impact speed, pocket drops; mute toggle
- [ ] Works at phone width in landscape

## Rendering

- [ ] **Decision:** top-down 2D on a canvas (the Flash-era look, much less work;
      recommended) or 3D with three.js (perspective, lighting; the cue angle and
      spin are easier to see)?
- [ ] Either way, balls show rolling: numbers and stripes turn with the ball's
      orientation, and they have shadows
- [ ] The physics doesn't depend on the choice, so a 3D view could come later

## Technical

- [ ] A standalone TypeScript app built with Vite: its own `deno.json` with a
      `build` task writing to `games/billiards/dist/` (see `AGENTS.md`)
- [ ] Physics, rules and game flow in plain TS; drawing on a canvas; menus and
      HUD as React components that only re-render when what they show changes
      (never every frame)
- [ ] Fixed internal resolution, 16:9 (a 2:1 table plus room for the HUD),
      scaled to fit; fills its window, since it runs in the platform's iframe
      and must also work opened directly at `/games/billiards/`
- [ ] Playback uses `requestAnimationFrame`, interpolating between recorded
      frames by real time, so it looks the same at any frame rate

```
games/billiards/src/
  physics/   constants, table geometry, motion, collisions, cue, simulateShot
  rules/     eight_ball.ts, timed.ts
  game/      game state and turn flow (aim → shot → playback → judge)
  render/    canvas drawing
  input/     aiming, power, spin, ball in hand → Shot
  net/       online play
  ui/        React screens and HUD
```

## Multiplayer

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
