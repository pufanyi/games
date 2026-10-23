# Bomb It 3 — design

A standalone TypeScript recreation informed by the user-supplied Bomb It 3 SWF.
Four modes and local two-player are implemented. This is a playable recreation,
not a pixel-identical port: see `CALIBRATION.md` for evidence and fidelity gaps.

## Modes and campaign

- [x] Arcade: humans survive as a team and eliminate the CPU opponents; bombs,
      breakable boxes, upgrades, pickups, vehicles, and environmental hazards.
- [x] Battle royale: unlimited starting hammer, limited-use special weapons,
      respawning opponents, first to 10 eliminations.
- [x] Water mania: continuous water jet pushes opponents into holes; first to 10
      eliminations. A water hit alone does not eliminate a player.
- [x] Race: themed vehicle, four ordered checkpoint positions, 13 checkpoints to
      finish, hits cause a temporary stop instead of elimination.
- [x] One or two humans, up to four total participants, three difficulty levels,
      3/5/10/15-level campaigns, three initial human campaign lives, retry and
      next-level flow, score and personal best.
- [x] Four selectable robot colors; selection is independent of input ownership.
- [x] 180-second rounds, timeout resolution, pause, and tab/focus-loss pause.

## Content

- [x] Farm, shopping mall, city, and aqua park themes plus random selection.
- [x] 48 layouts transcribed from the reference's map construction data: four
      variants per theme for normal, water, and race. Arcade and battle share
      normal layouts. Breakable candidates use seeded random placement.
- [x] Blast range, bomb capacity, speed, kick, shield, invincibility, extra
      life.
- [x] Hammer, water jet, laser, flame, launcher, grenade, and bowling attacks.
- [x] Horse, motorcycle, car, and hovercraft; themed starting race vehicles.
- [x] Jump pads, water currents and reversal switches, rails with a moving
      vehicle, sheep obstacles, and recurring item spawn pads.
- [x] Four-direction robot poses, movement animation, vehicles, blast effects,
      themed scenery and boxes, HUD, result screens, guide, and original audio.

## Controls

- [x] Solo: arrows or WASD; Space or Enter uses the current weapon.
- [x] Two-player: P1 WASD + Space, P2 arrows + Enter.
- [x] Most recently pressed direction wins; releasing it restores a held key.
- [x] Touch movement and action buttons for P1 with independent pointer
      ownership.
- [x] P/Escape and a button pause; focus loss clears all held input.
- [x] Music and sound controls; sound mute and personal best use guarded
      storage.
- [x] 4:3 responsive game stage; phone-width menu and touch controls.

## Architecture

Canvas 2D draws the arena and robot portraits using locally authored vector
shapes. React owns menus, controls, and lifecycle; it receives updates once per
second, on pause, and on results, not on every frame. Web Audio synthesizes an
original loop and effects. No external fonts, images, audio, Flash runtime, or
network calls are needed by a built game.

- `content/`: catalog and reference layout data.
- `game/`: deterministic 30 Hz simulation, seeded RNG, movement, combat,
  campaign rules, AI danger prediction and pathfinding. No browser or React
  imports.
- `rendering/`: Canvas drawing and readable status text; does not mutate state.
- `runtime/`: keyboard/pointer input, animation loop, browser focus, and sound.
- `ui/`: React screens, session lifecycle, settings, and CSS.

Map coordinates are cell centers. Solid walls and boxes block movement and
explosions; holes allow forced water displacement. A newly placed bomb grants
pass-through only to occupants until they leave its cell. AI shares the same
movement and attack functions as humans and forecasts chained blast windows.

Build with the game-local Vite task (`base: "./"`); the platform publishes the
output at `/games/bomb-it-3/`. The original SWF and decompiled source are
research inputs and are not distributed with the game.

## Verification

Tests beside the logic cover blast blocking and chains, departure/re-entry,
capacity, shielding, water falls, weapons, scoring and respawn, team wins,
campaign continuity, replay determinism, AI escape, and input cancellation. All
16 race layouts must be connected and finishable by computer drivers before the
round deadline. Browser checks cover menu to gameplay, two-player keys,
pause/resume, result continuation, sound-button focus, and phone layout.
