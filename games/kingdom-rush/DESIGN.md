# Kingdom Rush — design

A recreation of the original Flash tower defence game: build towers beside the
road, hold the line, and clear every wave. All seventeen campaign stages and
their campaign, heroic and iron variants are generated from the original SWF's
data. Check items off as they're built.

**Status:** the engine, all seventeen stages, the three modes, three
difficulties, local progress and the browser UI are built. Tower specializations
change stats only; their special abilities, heroes, account-wide meta upgrades
and audio are not implemented. See [CALIBRATION.md](CALIBRATION.md) for what is
measured, inferred or still missing.

## Core loop

- [x] Enemies walk a fixed road from spawn to exit, at a per-enemy speed
- [x] A leak costs the enemy's life cost (normally one); zero lives loses
- [x] Kills pay the enemy's bounty, and an escaped enemy still pays it, as in
      the original
- [x] Towers are built on fixed slots, take 30 ticks to finish, and can be sold
      for 60% of everything spent on them
- [x] Barracks train three soldiers who block the road and fight hand to hand
- [x] Waves start on a timer; the first wave waits for the player
- [x] The next wave's flag appears 50 ticks early and pays the remaining seconds
      as gold when clicked early
- [x] Victory when the last wave is spawned, no enemies remain, and 30 quiet
      ticks have passed; defeat at zero lives
- [x] 1×/2×/3× speed and pause, including a pause on tab loss
- [x] Two difficulty effects from the original: enemy health (0.8×/1×/1.2×) and
      soldier health (1.2×/1×/1×)

## Levels

Levels are numbered rather than named: the original's locale files are not part
of the SWF, so the recreation has no stage titles. All 17 stages ship with:

- [x] Campaign, heroic and iron wave lists, lives, starting gold, tower-slot
      layouts and preset towers
- [x] Per-mode tower-family level caps, including the iron-mode restrictions
      recovered from the original's `unlockMax*` fields
- [x] Fireball and reinforcement availability per mode
- [x] The original's road geometry, spawn points and exit markers
- [x] Seeded randomness per stage and mode, so a retry replays the same enemy
      lane choices
- [x] Sequential unlocking: the next campaign stage after a campaign clear,
      heroic after that stage's campaign, iron after its heroic

## Towers

Four families, each with three base tiers and two specialization branches:

| Family    | Base tiers                     | Branch A (cap 4) | Branch B (cap 5) |
| --------- | ------------------------------ | ---------------- | ---------------- |
| Archers   | Archer, Sharpshooter, Marksman | Rangers          | Musketeers       |
| Mages     | Mage, Adept, Wizard            | Arcane Wizards   | Sorcerers        |
| Artillery | Artillery, Howitzer, Mortar    | Big Bertha       | Tesla            |
| Barracks  | Militia, Footmen, Knights      | Paladins         | Barbarians       |

- [x] Costs, damage, range, reload, armour, health and regen from the original
      balance tables
- [x] Arcane damage ignores armour; artillery is elemental and falls off toward
      the blast edge; arrows are physical
- [x] The original's 8/15/34-tick charge animations, with the shot leaving part
      way through
- [x] Predict-the-target arrow and bomb arcs, accelerating magic bolts
- [x] Specializations are stat upgrades (and, for barracks, the new soldier
      stats); branch-specific abilities are not implemented
- [ ] Tower-specific special abilities: sniper shots, shrapnel, poison, thorns,
      teleport, death ray, chain lightning, healing, holy shield, etc.
- [ ] Account meta upgrades (extra tower levels, salvage, etc.)

The original's depots, elf barracks and other special slots are treated as
ordinary buildable slots. The level-5 elf barracks slot is not a repairable
building.

## Enemies

All 50 enemy classes found in the campaign data are available, including bosses.
Stats are the normal-difficulty values.

- [x] Armour, magic armour, dodge, speed, bounty, life cost, health, damage,
      reload and wind-up per class
- [x] Flying and otherwise unblockable enemies walk past soldiers
- [x] Per-class corpse time and boss flags
- [x] Soldiers' melee attacks can be dodged, as in the original
- [x] Regenerating enemies heal over time
- [ ] Ranged attacks (arrows, axes, bombs), spells, auras, heals, summons,
      shields, tower-freezing, area attacks, split-on-death and phase changes
- [ ] Enemy abilities tied to specific bosses (Veznan's portals, Yeti summons,
      Sarelgaz's spawn, etc.)

These omissions make some late enemies simpler than the original. They are
listed class by class in CALIBRATION.md.

## Powers

- [x] **Lightning**: one enemy within 26 px of the tap takes 1–500
      armour-ignoring damage; 750-tick cooldown
- [x] **Fireball rain**: three explosions at 30–60 armour-ignoring damage each,
      in a 100 × 70 ellipse, 10 ticks apart; 2400-tick cooldown
- [x] **Reinforcements**: two level-1 militia at the tap point, 50 HP, 1–3
      damage, 600-tick lifetime; 300-tick cooldown
- [x] Powers a level does not grant are shown disabled
- [ ] Power upgrades (bigger rain, scorched earth, knights, etc.)

## Controls

- [x] Mouse or touch: tap a slot to build, a tower to upgrade or sell, a power
      then the field to cast, and a barracks' rally button then the field to
      move its soldiers
- [x] Keyboard: Space sends the next wave, 1–3 sets speed, Esc/P pauses, Esc
      also cancels an armed power
- [x] Works at phone width: the board keeps a 4:3 aspect ratio, the HUD scales
      with container queries, and the side panel becomes a bottom sheet
- [x] The board scales to the viewport and the canvas draws at device resolution

## Screens and HUD

- [x] Stage picker with difficulty (easy/normal/hard), mission counts and
      per-mode clear/lock state
- [x] Game screen: lives, gold, wave counter, stage/mode label, speed and pause
- [x] Aim hint while a power is armed
- [x] Build panel with family descriptions and affordability
- [x] Tower panel with level, stats, upgrade costs and sell value
- [x] Pause, victory and defeat overlays with retry, next level and level select
- [x] Progress saved in `localStorage` per level and mode, wrapped in try/catch
- [x] Automatic pause and aim cancellation when the tab is hidden
- [ ] Music and sound effects
- [ ] Original stage names, wave warnings and tooltips (no locale data in the
      SWF)

## Art direction

The game does not ship any original bitmaps, sprites or sounds. Everything is
drawn procedurally in Canvas 2D, with an HTML/CSS HUD:

- [x] Layered terrain per level: grass, dirt roads, water, rocks, trees and
      stage-specific props, cached into an offscreen canvas
- [x] Towers that read at a glance: green-roofed archer towers, purple mage
      spires, wooden artillery, red-roofed barracks with a rally flag
- [x] Enemy figures by family with health bars, armour pips, bosses and flying
      shadows
- [x] Arrows, bolts, bombs, fireballs, explosions, lightning, hits, misses and
      coins
- [x] Range, build-slot, spawn and exit overlays
- [x] Lilita One font bundled with its SIL Open Font License in `src/fonts/`, so
      the game works offline

## Technical

- TypeScript + Vite, published as a static build at `/games/kingdom-rush/`.
  `base: "./"` keeps asset URLs relative.
- `src/game/` is a deterministic 30 Hz simulation with no browser or React
  imports; `src/rendering/` reads it without mutating; `src/runtime/` owns the
  session and progress; `src/ui/` is React and CSS.
- Canvas owns animation frames; React re-renders only when the HUD `View`
  changes.
- Content is generated from the original data into `src/content/`. Do not edit
  those files by hand; see CALIBRATION.md for the pipeline.
- Tests sit beside their modules: geometry and lanes, enemy damage and
  difficulty, tower building/upgrading/selling, wave timing, every stage/mode
  world, session actions, and the level picker's markup.
