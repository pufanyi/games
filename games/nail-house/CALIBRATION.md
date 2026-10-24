# Nail House — calibration

What was measured from the original SWF, how, and where this recreation
deliberately differs. Do not present estimates here as measured constants.

## Source

- Input: `钉子户大战拆迁队.swf` (DoSWF-protected ActionScript 3). The file is a
  research input only; it is not part of the published build.
- Unpacked by taking the trailing payload, XOR-decoding it with key 250 / step
  39, then zlib-inflating the result. The resulting SWF decompiles normally.
- Decompiled with FFDec 21.0.2: scripts, timeline frames, sprites, sounds,
  fonts, and `game.xml`.
- Source of truth for gameplay: `Game.as`, `Grid.as`, `Friend1.as`–`Friend6.as`,
  `Enemy1.as`–`Enemy6.as`, `Bullet.as`, `Catapult.as`, `Cracker.as`,
  `Dumbbell.as`, `FireBottle.as`, `Slipper.as`, `level_12`, `Timeline_29`
  (vine), and `gamewindow_59`.

## Confirmed constants

| Constant              | Value           | Source                      |
| --------------------- | --------------- | --------------------------- |
| Stage                 | 660×500         | SWF stage                   |
| Simulation rate       | 30 Hz           | frame scripts               |
| Starting HP           | 100             | `Game.as`                   |
| Starting money        | 100             | `Game.as`                   |
| Defender slots        | 4               | `Game.as` (`s0`–`s3`)       |
| Card levels           | 5               | `Grid.as`                   |
| Enemy attack cooldown | 30 ticks        | `Enemy1.as`                 |
| Enemy attack damage   | 1               | `Enemy1.as`                 |
| Spawn x               | 680             | `Game.as` (20 px off-stage) |
| Target x              | 120             | `Game.as`                   |
| Target y              | 355 ± 15        | `Game.as`                   |
| Spawn y               | 200–440         | `Game.as`                   |
| Death fade            | 36 ticks        | timeline                    |
| Win delay             | 30 ticks        | `Game.as`                   |
| Fire lifetime         | 150 ticks       | `FireBottle.as`             |
| Fire damage interval  | 30 ticks        | `FireBottle.as`             |
| Vine heal             | +1 HP / 10 taps | `Timeline_29`               |

Defender damage, interval, range, effect, and price arrays are copied from the
card objects in `Grid.as`; enemy HP, speed, bounty, and range from
`Enemy1.as`–`Enemy6.as`. Wave tables are copied from `Game.as` and live in
`src/game/levels.ts`.

### Defender cooldowns

`Friend1.setStat` converts each interval with `int(interval * 30)`, so the
recreation stores cooldowns in ticks rather than seconds:

| Card        | Ticks per shot (L1–L5) |
| ----------- | ---------------------- |
| Mom Ding    | 27 / 27 / 27 / 27 / 27 |
| Grandpa     | 60 / 60 / 60 / 60 / 60 |
| Big Bro     | 90 / 90 / 90 / 90 / 90 |
| Dad         | 12 / 12 / 12 / 12 / 12 |
| Auntie      | 90 / 88 / 87 / 85 / 84 |
| Little Ding | 90 / 87 / 84 / 81 / 78 |

### Targeting quirk

`Friend1.findNearest` compares `enemy.x - this.x` with the card range, but
`this.x` is 0 inside the window clip. The recreation therefore filters by the
enemy's stage x and picks the leftmost eligible enemy. Enemies whose HP is
already covered by reserved thrown damage are skipped, matching the original's
`hp2 > 0` guard.

## Deliberate differences

| Area             | Original                           | Recreation                                   | Why                                                |
| ---------------- | ---------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| Win check        | attacker list empty → 1 s → win    | all waves spawned and all enemies gone → 1 s | the original can win with queued enemies still due |
| Domain lock      | only 7k7k / 4399 / elics / file:// | none                                         | museum build must run anywhere                     |
| Undeployed price | label can show first upgrade price | shows the $100 deploy price                  | the label should match what the click charges      |
| Rifle tracer     | 1-tick bullet                      | 4-tick visual tracer                         | visible at 30 Hz; cooldown and DPS unchanged       |
| Spawn randomness | `Math.random()`                    | seeded RNG                                   | deterministic tests, random seed per real run      |
| Art and audio    | original sprites, fonts, sounds    | original Canvas art and Web Audio synthesis  | no Flash assets may ship                           |
| Names and copy   | Chinese                            | English display names                        | English development artifacts, clear UI            |

## Cosmetic liberties

- The pit, skyline, cranes, cliff, house facade, family portraits, crew, and
  weapon sprites are drawn procedurally; no extracted bitmaps are used.
- Spawn lanes are spread across the pit floor; the original also varies y, but
  its exact lane distribution was not recovered.
- The idle title scene parks two workers on the pit floor; that staging is new.
- Stage names and blurbs are written for this museum.
