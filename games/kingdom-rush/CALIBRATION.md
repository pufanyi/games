# Kingdom Rush — calibration

What this recreation measures from the original game, what it approximates, and
what it deliberately leaves out. Read [DESIGN.md](DESIGN.md) first.

The evidence is the original Flash movie (`皇家守卫军.swf`, a Chinese
distribution build of Kingdom Rush) opened with JPEXS Free Flash Decompiler
26.4. Its ActionScript and exported bitmaps are **research material only**: they
live in the gitignored `reference/` folder and are never committed or shipped
with the game. Everything in `src/content/` is numeric data transcribed from
that material; everything else is written from scratch.

## How the content is generated

`reference/pipeline/extract2.py` reads the decompiled sources and writes
intermediate JSON; `reference/pipeline/make_content.py` turns that JSON into the
TypeScript tables under `src/content/`. They are not part of the build and are
kept with the reference material because they only run against the FFDec output.

| Output                       | Contents                                                  |
| ---------------------------- | --------------------------------------------------------- |
| `content/levels/level_NN.ts` | lanes, spawns, exits, tower slots, all three modes        |
| `content/levels.ts`          | the ordered stage list                                    |
| `content/towers.ts`          | the four families, five tiers each                        |
| `content/enemies.ts`         | 50 enemy classes                                          |
| `content/powers.ts`          | fireball, lightning, reinforcements                       |
| `content/tower_tree.ts`      | tier order, names and upgrade descriptions (hand-written) |

Do not edit generated files by hand; change the pipeline and regenerate. The
generator evaluates the original's `GameSettings` expressions (field references,
arithmetic, `Math.round`, difficulty constants) rather than copying numbers by
hand, so the balance tables are the original's values at **normal** difficulty.
Difficulty is applied at runtime as the original does:

| Difficulty | Enemy health  | Soldier health |
| ---------- | ------------- | -------------- |
| easy       | ×0.8, rounded | ×1.2, rounded  |
| normal     | ×1            | ×1             |
| hard       | ×1.2, rounded | ×1             |

Everything below is in the original's 30 Hz tick, 800 × 600 coordinate space.

## Measured values used as-is

These come straight from `GameSettings` or the level classes and are not
reinterpreted:

- `framesRate = 30`, `rangeRatio = 0.7`, `sellPercent = 0.6`,
  `buildingTime = 30`, `enemyMaxLevel = 99`.
- Tower costs, damage, reload, range (width and height = range × 0.7), armour,
  soldier health, regen and regen interval, per tier.
- Enemy health, armour, magic armour, speed, bounty, life cost, damage, reload,
  attack wind-up, dodge chance, size, flying, blockability, corpse time and boss
  flag, per class.
- Level lives, starting gold, per-mode tower caps, per-mode fireball and
  reinforcement availability, tower-slot positions and rally points, preset
  towers, and every wave's spawn list, spawn intervals, initial delays, path
  assignments, alternate creep swaps and inter-wave interval.
- Power cooldowns and damage: fireball 30–60 per explosion every 2400 ticks;
  lightning 1–500 every 750; reinforcements 300 ticks, two level-1 militia (50
  HP, 1–3 damage, 600-tick lifetime).
- Damage dice are the original's `min + ceil(random × (max − min))`, so the
  minimum is effectively never rolled when the range has width. Armour reduces
  physical damage by `armour%`, magic damage by `magicArmour%`, and artillery by
  half the armour; lightning and "ignore" damage bypass armour entirely. Health
  stays fractional, as in the original.
- Enemy corpse removal after `deadTime` ticks; soldiers respawn after `respawn`
  ticks (300 for militia/footmen/knights, 420 for paladins).

## Reconstructed, but approximated

### Roads and movement

The original stores each lane as a dense list of points (roughly six pixels
apart) and walks enemies node by node, advancing when they get within
`speed + 0.1` of the next node. The recreation simplifies each lane with the
Ramer–Douglas–Peucker algorithm (1.5 px tolerance), stores cumulative arc
length, and moves enemies by distance. Consequences:

- Enemies travel slightly _shorter_ distances than the original, because they no
  longer overshoot or cut corners at node boundaries. Lane lengths are within a
  few pixels of the original polyline.
- Rendering, targeting, blocking and engagement all use the same arc-length
  parameter, so they stay consistent with each other.
- Tunnels are **not** modelled (see below).

### Engagement and exit

The original flips `isActive` at specific path nodes: it becomes true at
`countNodesActive`, false at `road.length − 11`, and the enemy leaks at
`road.length − 7`. The recreation bakes those three thresholds into
`engageAt`/`disengageAt`/`leakAt` as arc lengths using node 10, `length − 11`
and `length − 7`.

`countNodesActive` is **not** always 10: bosses override it to 5, and Veznan to
12. The recreation uses the same engagement point (node 10) for every class, so
bosses become targetable a little later than in the original.

### Randomness

- Lane choice for non-fixed spawns is a seeded integer in `[0, lanes − 1]`,
  matching `ceil(random × count) − 1`.
- The seed is derived from the stage id and mode, so retrying a stage replays
  the same lane choices, dodges and damage rolls. The original used unseeded
  `Math.random()`.
- Creep swapping (`creepAux`/`maxSameCreep`) alternates types every
  `maxSameCreep` spawns, as in `WaveSpawn`.
- Arrow aim adds ±5 px jitter on both axes; the original jitters x by `0..10`
  and y by `−10..0`. Visually equivalent.

### Towers

- Charge animation lengths are the original's (archer 8 ticks, shot on 7; mage
  15, shot on 10; artillery 34, shot on 10), but a tower shoots at the end of
  the charge with a single shot rather than replaying the original movie clip.
- Targeting picks the enemy furthest along the road, which is the original's
  rule (`fewest remaining nodes ≈ greatest distance` measured against a per-lane
  total that differs by a few pixels between parallel lanes).
- Artillery ignores flying enemies; archers, mages and barracks do not. This
  matches the original's `findNewTarget` arguments.
- Arrows arc with gravity over 17 ticks and can hit from tick 15; bolts home
  with the original acceleration rule (`accelerate + ceil(speed × 0.05)`, capped
  at 10) and magic armour; bombs fall over 27 ticks, use a 1.5 × area-wide
  ellipse and fall off linearly from max damage at the centre to min at the
  edge.
- Tower origins for projectiles are a single point above the tower; the original
  has two archer positions that alternate. Cosmetic.
- Barracks soldiers leave the tower when construction ends, pick the least
  advanced blockable enemy inside the rally ellipse (the original's
  `Soldier.findEnemy`), and up to two more soldiers can join the same enemy.
  Soldiers claim an enemy immediately and walk to it; the enemy stays put and
  starts swinging once a soldier arrives.

### Waves and victory

- The first wave waits for the player; later waves launch when the previous
  group has finished spawning **and** the wave timer reaches the interval. Waves
  with `interval = 0` launch together with the preceding one, and the wave
  counter counts groups, not individual wave objects (visualised as 7 "waves" on
  level 1, from 8 wave objects).
- The wave flag appears at 50 ticks left and pays
  `round((interval − counter) / 30)` gold when clicked; a wave also sends itself
  at zero. Both match `Level.as`.
- Victory needs every wave spawned, no active wave still spawning, no enemy
  alive, and 30 quiet ticks. The original only re-checks enemies every 10 ticks
  during that window and ignores dead bosses; re-checking every tick is
  equivalent except that a corpse removed between checks cannot delay a win.
- A leaked enemy costs its life value _and_ pays its bounty, exactly like
  `Enemy.§_-2c§`.

### Powers

- Lightning picks the living enemy with the largest y inside a 26 px tap radius.
  The original uses a pixel-accurate hit test (`HitTester.realHitTest`) so only
  enemies actually under the pointer count. The 26 px circle is an approximation
  of the bolt's click area.
- Fireball rain spawns three explosions 10 ticks apart, each offset by up to 15
  px in both axes (the original offsets x and y independently with a random sign
  and a 0–15 magnitude). Each fireball starts above the board and falls to its
  target; the original drops from y = 0 with its own animation.
- Reinforcements are always the level-1 militia. The five reinforcement upgrades
  in the original (`powers.knights`, `powers.farmers` level scaling, etc.) are
  not modelled.

## Not implemented

These are conscious omissions. They make late stages easier and some
specialisations plain stat upgrades, so treat the recreation as a faithful
engine with partial content, not a pixel-identical port.

### Tower special abilities

Specialisations change stats and barracks soldier stats only. Their abilities
exist in the extracted data but are unused:

| Branch         | Missing abilities                                                         |
| -------------- | ------------------------------------------------------------------------- |
| Rangers        | poison arrows (5 damage over 90 ticks), thorns (up to 2 enemies, 3 times) |
| Musketeers     | sniper shot (20 % instant kill every 420 ticks), shrapnel (10–40 splash)  |
| Arcane Wizards | teleport (up to 3 enemies back 20 nodes), death ray (instant kill)        |
| Sorcerers      | polymorph, elemental summon, armour curse                                 |
| Big Bertha     | missiles (60–100, +40 per upgrade), cluster bombs                         |
| Tesla          | charged bolts (3 targets), overcharge area damage                         |
| Paladins       | healing (40–60), holy strike (25–45), armour shield                       |
| Barbarians     | throwing axes (24–32), dual weapons (+10 damage), hunting nets (slow)     |

Company-wide account upgrades (`GameUpgrades`: extra tower levels, salvage,
eagle eye, arcane shatter, blazing skies, cataclysm, …) are not modelled. They
are the reason some level/mode tower caps are stored as 0; see below.

### Enemy abilities

Most classes with a special ability fight as ordinary melee enemies. The
following fields are extracted but unused, class by class:

- **Ranged attacks**: `shadowArcher` (arrows), `trollAxeThrower` (axes),
  `goblinZapper`/`raider`/`theThing` (bombs).
- **Area attacks**: `pillager`, `forestTroll`, `lavaElemental`, `yeti`,
  `yetiBoss`, `theThing`, `juggernaut`, `rottenBoss`, `veznan`, `bossBandit`.
- **Explode on death**: `demon`, `demonWolf`, `demonMage`, `goblinZapper`.
- **Healing and buffs**: `shaman`, `goblinChieftain` (heal allies), `bossBandit`
  (stop and heal), `trollChieftain` (rage), `yetiBoss` (freeze towers, summon
  wolves and yetis).
- **Summons and spawns**: `necromancer` (skeletons), `spider`/`rottenSpider`
  (eggs), `juggernaut` (heads, missiles), `yetiBoss`, `veznan` (portals, demons,
  Tsung).
- **Shields and speed bursts**: `demonMage` (shield), `rocketeer` (fast flight),
  `veznan` (tower hold).
- **Boss scripts**: Veznan's phases and portals, Sarelgaz's reinforcements, the
  Yeti boss's summon cycle, the Juggernaut's heads, Rotten Boss bombs.

Flying (`demonImp`, `gargoyle`, `rocketeer`) and unblockable (`bossBandit`,
`demonImp`, `gargoyle`, `ogre`, `rocketeer`) flags are honoured.

### Tunnels

Levels 7, 8 and 16 have tunnels: enemies go underground, are untargetable while
inside, and move at double speed until they surface. The recreation draws and
walks the road normally, so those enemies stay visible and can be shot the whole
way. Tunnel indices are still in the intermediate JSON if this is ever added.

### Other omissions

- **Heroes** (and their abilities and level-ups) are absent.
- **Stars**: the original awards 3 stars for 18+ lives, 2 for 6–17 and 1 for 0–5
  in campaign, always 3 in heroic and iron. Progress here records only cleared
  modes, so the picker shows "challenges cleared" rather than stars.
- **Stage names, wave warnings, tooltips and tutorial prompts**: the locale
  files are not inside the SWF (`Locale.loadStringEx` reads external XML), so
  the recreation numbers its stages and omits notifications.
- **Audio**: no music or effects; no original audio is extracted or shipped.
- **Achievements, hero rooms, the shop and other meta screens.**
- **Special slots**: depots, elf barracks and `TowerSoldierElfDestroyed` are
  treated as ordinary buildable slots. The original's elf barracks is a
  repairable building with its own unit.

## Tower caps and the 0 fallback

The original resolves a level/mode cap of 0 by consulting the player's account
upgrades (`unlockMax*Level`). There is no account progression here, so each
stage now stores its own `unlockLevels` value (recovered from the same
`unlockMax*Level` assignments) and a raw 0 uses it. A 0 there means the family
is unavailable, which is how Iron Challenges lock out tower types; level 1's
Iron mode, for example, allows only artillery and barracks. Every stage and mode
still has at least one buildable family; a test enforces it.

Specialisation branches are reached from tier 3: a cap of 4 unlocks the first
branch, a cap of 5 unlocks both. Taking either branch is the end of the line.

## Art and UI

No original artwork, fonts, sprites or sounds are shipped. Terrain, towers,
enemies, projectiles and effects are drawn procedurally on a Canvas 2D at the
original's 800 × 600 proportions; the HUD is HTML/CSS and scales with container
queries. The bundled Lilita One font (SIL Open Font License) is the only
third-party asset.

## Known gameplay deviations worth remembering

- Bosses engage at node 10 instead of node 5 (Veznan: 12).
- Tunnelled enemies on levels 7, 8 and 16 can be attacked and move at normal
  speed.
- Enemy specials are missing, so ranged and support classes are weaker.
- Tower and power upgrades are missing, so the player's late-game power is lower
  than the original's.
- Stars, heroes and audio are absent.

Everything else — maps, waves, economy, tower and enemy stats, mode caps,
powers, the wave flag, leaks and victory — follows the extracted data and the
rules cited above.
