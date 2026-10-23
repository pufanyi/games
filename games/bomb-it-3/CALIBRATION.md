# Reference evidence and fidelity

## Reference identity

The user supplied a 4,447,309-byte compressed SWF, format version 10. SHA-256:
`760f4cd7438a03143cc62ed5518c8e05da17212f0b8a404cd13af46e61c38318`. Its internal
game name is `Bomb It 3`; metadata names zlonggames.com and spilgames.com and
records 2010-11-02. JPEXS 26.4.0 exported its ActionScript for local inspection.
The binary and exported source are not committed or shipped.

The SWF header declares 600 × 450 at 30 FPS. `BombitConst.FRAME_RATE` is 35,
which is used by some counters; that is not proof the runtime actually rendered
at 35 FPS. This remake runs a fixed 30 Hz simulation and preserves the 350-tick
invincibility counter. It has not been calibrated against original-runtime frame
captures, so exact timing equivalence is not claimed.

## Confirmed evidence used

| Evidence location                                   | Finding                                                                                    | Implementation                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `BombitConst`                                       | 17 × 15 map, 30-pixel source cells; box/item/robot scores 10/100/100                       | Same grid and score units; presentation scales cells to fit the new HUD                                       |
| `gameengine/Game`                                   | `gameInitTime = 180`                                                                       | 180-second round                                                                                              |
| `gameengine/robot/RobotModel`                       | power/capacity 1, velocity 1.5                                                             | Initial power/capacity/velocity                                                                               |
| `maps/Grid`                                         | default resistance 0.6                                                                     | Current constant-speed movement approximates steady-state original acceleration, not the full motion equation |
| `bombs/Bomb`                                        | counter initialized at 0, detonates when greater than 60; fire counter greater than 15     | 62 updates to fuse expiry; 17-tick fire                                                                       |
| `items/tools/PowProp`, `SpeedProp`                  | range capped at 5; speed increments 0.3 toward 2.1                                         | Matching upgrade caps                                                                                         |
| `items/tools/ShieldProp`, `InvincibilityProp`       | one shield use; 10 × 35 invincibility ticks                                                | One hit; 350 ticks                                                                                            |
| Embedded `GameMode` XML                             | three campaign lives; AI decision intervals vary per mode and difficulty                   | Same initial lives and decision-interval tables                                                               |
| `gamemode/ArcadeMode.end`                           | win when no CPUs remain; lose when no humans remain                                        | Team survival with separate human scores                                                                      |
| `items/weapons/KillModeWeapon`                      | extends HammerProp, overrides use-count depletion                                          | Unlimited default battle hammer                                                                               |
| `bombs/WaterBomb`                                   | five-cell nominal jet; push speed 8; falling into BlackHole scores a kill                  | Five-cell continuous push at 8/30 cell per update, fall scoring                                               |
| `gamemode/KillMode`, `WaterMode` and AbstractPlayer | 10-kill target, respawn after death                                                        | First to ten, respawning competitors                                                                          |
| `maps/platform/CheckPoint`                          | four linked positions per character; stop at 13 passes                                     | Character-specific ordered four-point circuits; target 13                                                     |
| `items/rides/*InSpeedMode`                          | horse/bike/car/hovercraft velocity 1.4/2.3/2.2/1.6; CPU difficulty multipliers 1/1.05/1.06 | Same tuning inputs                                                                                            |
| `gamemode/SpeedMode.initMap`                        | active pool is 3 flame, 3 laser, 2 bowling                                                 | Uses executable pool, not the broader dormant XML list                                                        |
| `maps/mapData/{Farm,Shop,City,Water}MapData`        | 12 construction functions per theme                                                        | 48 grids, candidate box cells, holes, checkpoint coordinates, and feature placements                          |
| `gameengine/ai/state/*`                             | free, box, item, attack, evade, speed behavior roles                                       | New deterministic controller with those behavior goals and chain-danger forecasts                             |

`content/layouts.json` records the cell assignments from each named construction
function. `#` means fixed wall, `?` a probabilistic breakable candidate, `~` a
hole, and `.` floor. Feature arguments retain source direction and art-frame
identifiers for traceability, but no Flash graphics are imported. Checkpoint
lists preserve constructor order per character, which follows each four-point
linked cycle in the inspected source.

## Deliberate differences and remaining calibration

The game has all four playable mode loops, but these details are approximations
and should be compared with original gameplay before calling it a faithful port:

- Movement uses a constant speed derived from steady-state resistance, with
  explicit grid-turn assistance. Original acceleration, animation-driven hit
  boxes, collision tolerances, and sliding inertia are not fully reproduced.
- Source candidate box cells are preserved with a 0.6 seeded chance. Original
  difficulty-dependent map population, item allocation, and distribution across
  empty cells are not fully reproduced. Hidden-item probability is 0.72 here.
- Weapon animations and hit timing are independently implemented. Laser rays,
  three-cell flame, hammer reach, rocket impact, four-cell grenade travel, and
  bowling collision need original-runtime measurement. Limited specials use two
  shots; the optional water pickup uses 175 updates.
- Resurrections use a 45-tick wait and 60 protected ticks; protective hit grace
  is 45 ticks. Those are remake tuning, not verified original values.
- Water-slide reversal currently reverses all current tiles together. Original
  switch-group wiring, curved-slide animation, and all cart/sheep interactions
  are simplified. Jump pads relocate the character to a valid landing cell; they
  do not yet reproduce airborne animation or launch bombs.
- The rail vehicle follows the extracted ordered rail positions. Its collision,
  speed, appearance, and sheep wandering are approximations.
- AI uses new search and escape logic; matching decision intervals does not make
  its decisions identical to the original. It does not reproduce every original
  random-action branch or vehicle-specific tactical behavior.
- On timeout, this recreation compares living participants for arcade,
  eliminations for battle/water, and checkpoints for race; humans win ties. The
  source contains suspicious timeout branches (including race comparisons of
  kill counts and an arcade type check against the whole array); those bugs are
  not deliberately reproduced.
- Score totals and campaign carry-over are implemented, but the source's
  detailed category-by-category score animation is replaced with a compact
  results view.
- Menus, robot names, artwork, scenery, and all audio are original redraws or
  synthesis. They are not pixel/audio matches. English copy follows repository
  policy. Original language selection, control rebinding, sponsor links, online
  score submission, and achievement service integration are absent.

## Asset provenance

The supplied SWF did not include an identified redistribution license for its
art or audio. No extracted images, fonts, sounds, or ActionScript are shipped.
Canvas artwork and synthesized music/effects were authored for this recreation.
Numeric map geometry and gameplay observations inform the implementation. No
external asset/CDN requests are made during gameplay.

## Further calibration workflow

Keep the exact reference hash above, capture original input sequences and frame
timings, then compare scenarios with this simulation: corner turns,
leave/re-enter bomb cells, chained explosions through boxes, held water fire,
shield depletion, vehicle hits, checkpoint order, and mode timeout. Change
constants with supporting evidence and add regression cases beside the affected
module. Do not silently upgrade an estimate to a measured original constant.
