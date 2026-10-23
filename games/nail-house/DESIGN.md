# Nail House — design

A remake of `钉子户大战拆迁队` ("Nail House vs. the Demolition Crew"), a
Flash-era tower-defence game. The Ding family refuses to move; you put them in
the windows of their house and spend the cash the demolition crew drops to hold
the line. Check items off as they're built.

**Status:** v1 is complete. All seven stages, the six-card shop, the vine heal,
local progress, pause/help, keyboard and touch input, and original Canvas art
are in place. Source is in `src/`; `deno task dev` here runs it on its own with
hot reload.

The game is a recreation, not an emulator: no SWF, Ruffle, or extracted Flash
assets are shipped. Art and audio are original. See
[CALIBRATION.md](CALIBRATION.md) for the decompiled values this ports and the
deliberate differences.

## Core loop

- [x] The stage is a fixed 660×500 logical board (4:3), simulated at 30 Hz and
      scaled to fill the browser window
- [x] The house starts at 100 HP and $100; four of the six family members can be
      deployed at once
- [x] Each family card deploys into the next free window, then upgrades in place
      up to level 5
- [x] Deploy costs $100; upgrades cost $200, $250, $350, then $400
- [x] Enemies walk in from the right edge, stop at their range, and hit the
      house once per second for 1 HP
- [x] Killing an enemy pays its bounty immediately; there is no between-wave
      shop
- [x] Clearing every wave wins the stage; losing all HP ends it
- [x] Ten taps on the vine at the foot of the house heal 1 HP
- [x] Winning a stage unlocks the next one; progress survives a reload
- [x] Stage 7 is endless survival: no win, only a final score

## The family

Each card has five levels. Damage is per hit; interval is the shot cooldown in
seconds (the sim stores it in ticks); range is measured from the house in stage
pixels. Thrown weapons (slipper, dumbbell, catapult) reserve their damage at
launch so other defenders do not waste shots on a doomed target.

| Card         | Role           | Damage (L1–L5)           | Interval    | Range | Area effect                         |
| ------------ | -------------- | ------------------------ | ----------- | ----- | ----------------------------------- |
| Mom Ding     | Slipper        | 10 / 20 / 30 / 40 / 50   | 0.9 s       | 400   | –                                   |
| Grandpa Ding | Old rifle      | 22 / 44 / 66 / 88 / 110  | 2 s         | 500   | –                                   |
| Big Bro Ding | Dumbbell       | 25 / 50 / 75 / 120 / 200 | 3 s         | 400   | slows for 1 s in `90 + 10×level` px |
| Dad Ding     | Brick catapult | 4 / 8 / 12 / 16 / 20     | 0.4 s       | 450   | –                                   |
| Auntie Ding  | Fire bottles   | 2 / 4 / 6 / 8 / 10       | 3 s → 2.8 s | 400   | burns for 5 s in `45 + 7×level` px  |
| Little Ding  | Firecracker    | 10 / 20 / 30 / 40 / 50   | 3 s → 2.6 s | 400   | blasts `45 + 6×level` px on impact  |

A fire bottle leaves a burning patch that damages everything inside once per
second for five seconds. Dumbbell and firecracker splash damage is immediate.

## The crew

Speeds are stage pixels per 30 Hz tick; range is how close to the house the
enemy stops before attacking.

| Enemy         | HP  | Speed | Bounty | Range |
| ------------- | --- | ----- | ------ | ----- |
| Knife Thug    | 25  | 1     | $10    | 20    |
| Sledge Brute  | 50  | 0.8   | $15    | 20    |
| Shovel Hand   | 75  | 1     | $20    | 20    |
| Crate Biker   | 120 | 1.5   | $25    | 50    |
| Jackhammer    | 200 | 0.6   | $30    | 60    |
| Wrecking Ball | 400 | 0.6   | $35    | 90    |

Every enemy deals 1 damage per attack with a one-second cooldown. Knife Thugs,
Sledge Brutes, and Shovel Hands get ±5 px of range jitter so the line does not
look mechanical.

## Stages

Wave tables come from `Game.as`. A wave spawns `count` enemies starting at
`startTime` ticks, and its interval shrinks by one tick after every spawn until
it reaches `min`.

| # | Name            | Waves (enemy × count)                                                           |
| - | --------------- | ------------------------------------------------------------------------------- |
| 1 | First Stand     | Knife ×20, Sledge ×5                                                            |
| 2 | More Muscle     | Knife ×35, Sledge ×20, Shovel ×5                                                |
| 3 | Three Fronts    | Knife ×16, Sledge ×16, Shovel ×8, Biker ×2                                      |
| 4 | Rush Hour       | Knife ×66, Sledge ×36, Shovel ×16, Biker ×6, Jackhammer ×2                      |
| 5 | Heavy Equipment | Knife ×90, Sledge ×46, Shovel ×26, Biker ×6, Jackhammer ×3, Wrecking Ball ×1    |
| 6 | The Long Siege  | Knife ×165, Sledge ×78, Shovel ×45, Biker ×22, Jackhammer ×12, Wrecking Ball ×8 |
| 7 | Final Stand     | Endless: Knife, Sledge, Shovel, Biker, Jackhammer, and Wrecking Ball, 999 each  |

## Controls

- Click or tap a card to deploy or upgrade; keys 1–6 buy the same cards
- `P` or `Esc` pauses; the HUD buttons pause, mute, and open help
- Click or tap the vine to heal; the ring around it shows the ten-tap progress
- The board scales to the window; there is no scrolling and no fixed pixel size

## Progression and persistence

- Stage 1 starts unlocked; a win unlocks the next stage, up to stage 7
- `localStorage` stores the highest unlocked stage and the mute preference,
  wrapped in try/catch so private browsing still works
- Reloading the page keeps progress but not an in-progress run

## Rendering and audio

- Canvas 2D draws the whole stage: skyline and cranes, the excavation pit, the
  brick house, the family in the windows, the crew, weapons, fires, and effects
- The house sits on a cliff at the left; enemies approach across the pit floor
  from the right, which keeps the four window slots readable
- React owns the menus, HUD, card bar, pause/help/result overlays, and pointer
  and keyboard bindings; it never renders a frame
- Animation frames are owned by the Canvas loop; React updates on transitions
  and once per second
- Sound is synthesised with Web Audio (rifle, slipper, impact, coin, burn, win,
  lose); the mute toggle persists

## Source organization

- `src/game/`: deterministic simulation, catalog and tuning, wave tables, seeded
  RNG, and tests. No browser, React, or Canvas imports.
- `src/rendering/`: original Canvas art, actors, effects, and the frame
  composer. Reads game state without mutating it.
- `src/runtime/`: session actions, local storage, audio, and the browser-facing
  view model.
- `src/ui/`: React screens, card bar, overlays, Canvas host, and CSS.
- `src/main.tsx`: the browser entry point.

## Fidelity notes

The recreation follows the decompiled simulation closely, including the
original's leftmost-target rule, the "reserve damage at launch" behaviour of
thrown weapons, and the ten-tap vine heal. It differs in a few places on
purpose:

- **Win condition:** the original ends a stage when its attacker list becomes
  empty, which can happen while late enemies are still queued. The recreation
  waits until every wave is spawned and every enemy is gone, then applies the
  same one-second grace period.
- **Domain lock:** the SWF refuses to run unless the loader URL contains
  `7k7k.com`, `my4399.com`, `elics.cn`, or `file://`. The recreation has no such
  check.
- **Card price display:** the original's shop label can show the first upgrade
  price on an undeployed card. The recreation shows the actual $100 deploy
  price.
- **Projectile travel:** the rifle bullet is a one-tick hit in the SWF; here the
  tracer lives for four ticks so it is visible at 30 Hz. Cooldowns are
  unchanged, so damage per second is the same.
- **Randomness:** spawn lanes, target jitter, and range jitter use a seeded RNG,
  so a run is reproducible in tests while real play gets a random seed.
- **Presentation:** stage names, copy, art, and audio are new. The original
  Chinese names and assets are not redistributed.
