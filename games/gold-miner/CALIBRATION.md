# Gold Miner calibration

Target: the classic single-player Flash game (`黄金矿工`) as distributed around
2000, not HTML5 clones or the two-player edition. This remake embeds no Flash
content and no emulator: it reproduces numeric geometry, rules, and timing that
were read out of the original file, and draws its own art.

**What "measured" means here.** A copy of the original SWF was decompiled
(ActionScript 2 dumps plus a tag-level sprite dump) and the numbers below were
read from its data: matrices, hit boxes, frame labels, and script constants.
This is source-level evidence, not frame-by-frame pixel fitting, so behaviours
that the scripts express as approximations (depths, sprite offsets) are
reproduced as written. The original `.swf`, the decompiled scripts, and the
extracted assets are research inputs only and are not part of this repository or
any build.

## Coordinate mapping

The original stage is 550 × 400 at 18 fps. The remake keeps an 800 × 600 world
and maps the stage with `SCALE = 1.4`, so the 550 × 400 playfield becomes 770 ×
560 and sits inside it:

```
worldX = 400 + (x - 275.5) * 1.4
worldY = 108 + (y - 48.6) * 1.4
```

- The winch pivot (`C` on the root at stage 275.5, 48.6) is world (400, 108).
- The top of the dirt (original stage y 68) is world y 135.16.
- All animation clips keep running at 18 fps: the simulation ticks at 60 Hz and
  advances clip frames by `18 / 60 = 0.3` per tick, so motion is smooth without
  changing timing.

ActionScript frame numbers are authoritative. The decompiler's `fN` labels are
one frame lower than the timeline: its `f43` is frame 44, which is why the
restored `up42` label really sits on frame 44.

## Swing (root clip `C`, sprite 289)

The swing is a rotation keyed on every frame of the `C` timeline. Frame 3 places
the claw clip; frames 4-86 rotate the existing claw by the recovered matrix.
Frame 86 is 0°, then the clip jumps back to frame 3 (6°), so the return sweep
`0° → 6°` takes a single animation frame.

`src/game/original.ts` holds all 84 keys, from 6° up to 67.42°, down through 0°
at frame 44, to -68.44° at frame 65, and back to 0° at frame 86. The table is
rotated in Flash's positive direction; the world angle is its negation, so
positive world angles swing right. `random(82) + 1` in frame 2 starts the clip
anywhere in frames 3-84.

Firing does **not** stop the swing. `C` plays straight through the shot and is
only reset (`_root.C.gotoAndPlay(1)`) by the bonus clip at the payout frames
listed below. The claw therefore sweeps along the rotating down direction until
it is paid out.

## Claw (`cl`, sprite 288)

- Frame 1 is the rest pose: local y 12.45 → world rope 17.43 px.
- Frames 2-42 extend: local y 12.45 + (frame - 2) × 9.86, so frame 42 reaches
  406.85 (world 569.59). Frames 42-44 pull a couple of pixels back to 404.1
  (world 565.74) before the empty-return child takes over. The empty clip's
  label `up42` is on frame 44.
- Each frame 2-42 sets `up = _currentframe`. The label `upN` is the frame the
  retract clip jumps to when the grab happens during extension frame N. The
  recovered pairs (N = 2…42, frames 288, 285, 273, …, 44 with local y 66.4 …
  404.1) are in `original.ts`.
- The grab box is sprite 256, a 12.4-stage-pixel square attached to the claw; at
  frame 44 it is replaced by sprite 286, so nothing can be grabbed while reeling
  in. The world check uses the rotated box's axis-aligned bounding box,
  `(12.4 / 2) × (|cos| + |sin|) × 1.4`.
- Retract speed per animation frame comes from the frame-44 child: `15` when
  `stickBonus` is set (empty return, dynamite hit, weight -1) or `/:strength` is
  1; otherwise `max(1, /:minerStrength - weight)`. Weight > 1 stops the timeline
  on that frame (`_parent.stop()`), weight ≤ 1 gets one natural frame before the
  `enterFrame` handler moves it.
- Payout starts at frame 293 (local y 59.5, world 83.3) and runs the bonus clip
  (sprite 306). Offsets from its frame 2: empty resets at 1; cash sets `/:busy`
  at 2, adds the money at 30, and ends at 32; a power bag grants `/:strength` at
  34 and resets at 54; a dynamite bag adds a stick at 76 and resets at 77. This
  remake returns the claw to the swing at the clip's end for every payout, so a
  cash payout's claw is usable two animation frames later than the original's
  `_root.C.gotoAndPlay(1)` at 30.

## Items

Values, weights, hit boxes (`ob.box`), and drawn sprite bounds are in
`src/game/items.ts`, converted to world pixels. The original item table:

| Object | Item    |  Price | Weight |
| -----: | ------- | -----: | -----: |
|      2 | gold    |     50 |      3 |
|      3 | gold    |    100 |      7 |
|      4 | gold    |    250 |      8 |
|      5 | gold    |    500 |      9 |
|     14 | rock    |     11 |      8 |
|      8 | rock    |     20 |      9 |
|     11 | diamond |    600 |      2 |
|     10 | pig     |    602 |      5 |
|      6 | mole    |      2 |      3 |
|      7 | bone    |      7 |      3 |
|     13 | skull   |     20 |      2 |
|      9 | TNT     |      1 |      2 |
|     12 | bag     | rolled | rolled |

Bonuses: diamond polish makes the diamond 900 and the pig 902; the rock book
triples rock prices (11 → 33, 20 → 60).

### Bags (object 12)

Rolled when the level loads, one draw for the prize and one for the weight.

| Roll `random(6)+1` | Normal                | Clover                            |
| ------------------ | --------------------- | --------------------------------- |
| 1-3                | `random(600)+1` cash  | 1-2: power                        |
| 4                  | power                 | 3-4: dynamite if stick ≤ 3        |
| 5                  | dynamite if stick ≤ 3 | 5-6: 700                          |
| 6                  | 800                   | (3-4 otherwise `300+random(300)`) |

When a dynamite roll happens with four sticks already, it pays cash instead
(100-199 normal, 300-599 clover). Weight: `random(4)+1` → 1-9, negative 1-5, 9,
or -1.

### TNT and dynamite

- Grabbing a TNT sends it to frame 2. Its explosion box appears 8 animation
  frames later: world 270.85 × 243.53. Chained barrels explode where they stand.
  The claw still delivers the barrel's $1 unless it is dynamited.
- Up throws a stick only while retracting and only with `stick >= 1`. A stick
  decrements immediately; the projectile homes at 50% of the remaining distance
  per animation frame. On contact the held item's price becomes 0, `stickBonus`
  is set (fast return) and the item is hidden. Its blast is world 54.31 × 48.83,
  also after 8 frames.

## Levels

- 30 fixed layouts: 10 themes × 3 variants. The root plays
  `"L" + level + "_" + (random(3) + 1)`; levels 11+ wrap back to theme 4 and
  cycle 4-10. `src/game/layouts.ts` holds the recovered item type, position, and
  facing for every entry, converted to world coordinates.
- Pigs and moles walk inside their container (scale 0.596): local x from 3.5 to
  -381.6 at ~4.894 px/frame, hold `random(20)+1` frames, then return to 4.45 at
  ~4.6 px/frame and hold again. Facing is fixed per layout entry; the world
  position is `anchor + facing × localX × 0.596 × 1.4`.

## Flow

- Start (`DefineButton2_29`): `time = 60`, `total = 10`, `goalAddOn = 0`,
  `goal = 375`, `stick = 0`, `score = 0`, `level = 0`, `levelDis = 0`.
- Root frame 15: goal 650, `level = 1`. Frame 48 loads the layout and clears
  `/:strength`. Frame 52 advances the goal (`+270` while `levelDis <= 9`) and
  the level, wrapping to 4 after `total` levels.
- Frame 86 loads the next layout; frame 90 compares `score >= goal` and either
  opens the shop or the lose path (frame 140).
- Shop entry resets `/:minerStrength` to 10, `/:strength` to 0, and all level
  bonuses, so purchases only apply to the next level.
- Goals: 650, 1195, 2010, 3095, 4450, 6075, 7970, 10135, 12570, 15275, then
  +2705 per level (17980, 20685, …).
- Timer clip (sprite 188): one displayed second every 18 frames, but 21 frames
  at 10 seconds or less. At zero it waits 18 frames and retries while `/:busy`
  is set (a cash payout in progress) instead of ending the level. There is no
  early end when every item has been collected.

## Shop

Five fixed slots, front to back: dynamite, strength drink, clover, rock book,
diamond polish. Stock is rolled in slot order (strength/clover/book/polish, plus
dynamite when `stick < 5`), then prices in display order; an out-of-stock slot
has no goods and no button and consumes no price random.

| Slot     | Stock              | Price                          |
| -------- | ------------------ | ------------------------------ |
| dynamite | `stick < 5`        | `random(300)+1 + level×2`      |
| strength | `random(10)+1 < 5` | `random(300)+100`              |
| clover   | `random(10)+1 < 5` | `random(level×50)+1 + level×2` |
| book     | `random(10)+1 < 7` | `random(150)+1`                |
| polish   | `random(10)+1 < 6` | `random(level×100)+1 + 200`    |

Buying never checks the purse: the price is subtracted, so the money total can
go negative.

## Known gaps

- The RNG is a seeded mulberry32, not Flash's generator. Sequences have the
  right distributions and order but are not the original's.
- The original's server-side name submission (`bluecat/game/postUsername.jsp`)
  and score upload are not reproduced.
- Sprite art, sound, fonts, and the Chinese UI text are re-created rather than
  copied; positions and sizes follow the recovered bounds, but the artwork is
  not pixel-identical.
- The title, shop, and level-end presentation are new UI; only the game rules,
  geometry, and timing claim to follow the original data.
- The 8-frame blast delay and both blast boxes come from the explosion clip's
  `box` child; whether the original tests the box on the same frame the child
  appears is inferred from the script order.
- The miner's pose changes (left/right/down) and the reel sound do not change
  simulation behaviour and are approximated visually.
