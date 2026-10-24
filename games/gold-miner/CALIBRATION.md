# Gold Miner calibration

Target: the classic single-player Flash game associated with 4399, not modern
HTML5 clones or the two-player edition. This remake does not embed Flash assets
or an emulator. Historical guides support some behavior, but no original
executable has been measured frame by frame. Do not call this exact parity.

## Evidence

- [4399's 2010 player guide](https://news.4399.com/xyxgl/201004-23-67116.html)
  describes 250/500 gold, 600/900 diamonds, the 11/33 rock-book payout,
  variable-weight bags, low and high bag rewards, and nearby dynamite damage. It
  reports slow heavy-gold retrieval and roughly eight seconds saved by a
  strength drink. These timings are anecdotes, not controlled measurements. Its
  early-diamond statements conflict with each other; neither permits a precise
  appearance probability.
- [A historical player's level notes](https://gogoldminer.blogspot.com/) list
  the four gold denominations as 50, 100, 250, and 500. Search-index text was
  available during review; the full page returned HTTP 429.
- [A 2011 walkthrough](https://www.fxxz.com/gonglue/17178.html) lists early
  goals: 650, 1195, 2010, 3095, 4450, 6075, 7970. Those already match the
  implementation.

## Changes supported by descriptions

- Four gold sizes now pay 50, 100, 250, and 500. The former 150 tier is gone.
- Diamond polish retains 600 → 900, and the rock book retains 11 → 33.
- Bags can be light or as heavy as huge gold. Their weight is generated once,
  stored in the item, and survives serialization.
- Ordinary cash bags can now yield 2–800. Clover cash bags yield 700–800. These
  intervals include reported outcomes; their uniform distributions and the
  clover interval are approximations, not recovered original rules.
- Dynamite destroys its held item and nearby treasure, including TNT chains. The
  50-pixel dynamite radius and 110-pixel TNT radius remain estimates.
- The first mine has no diamonds. Later diamond odds remain unverified.

## Approximate motion calibration

All distances use an 800 × 600 logical canvas. Screen scaling does not change
simulation timing. A fixed 60 Hz simulation drives movement and the timer.

| Item        |                   Value |            Weight | Return speed (px/s) | 350 px return (s) |
| ----------- | ----------------------: | ----------------: | ------------------: | ----------------: |
| Small gold  |                      50 |               1.6 |                 350 |              1.00 |
| Medium gold |                     100 |                 5 |                 112 |              3.13 |
| Large gold  |                     250 |                10 |                  56 |              6.25 |
| Huge gold   |                     500 |                20 |                  28 |             12.50 |
| Small rock  |                      11 |                10 |                  56 |              6.25 |
| Large rock  |                      20 |                22 |               25.45 |             13.75 |
| Diamond     |                     600 |                 1 |                 560 |              0.63 |
| Bag         |                  Random | 1.4 / 5 / 10 / 20 | 400 / 112 / 56 / 28 |        0.88–12.50 |
| Bone        |                       7 |               1.2 |              466.67 |              0.75 |
| Mole        | 2, plus carried diamond |               1.2 |              466.67 |              0.75 |

Times above are continuous estimates; simulation completion can take one extra
1/60-second tick. They exclude aiming and extension. Heavy-item weights and a
2.5× strength multiplier are chosen to approximate the historical slow-haul
experience: huge gold takes about 12.5 seconds over 350 pixels, or 5 seconds
with strength, saving 7.5 seconds. **They are not original measured constants.**
Medium gold and rock weights are likewise tuning choices. Bag weights are
sampled uniformly from the four listed weights independently of rewards.

Retained, unverified settings: ±70° swing, 1.9 rad/s angular speed (about 2.6
seconds per complete cycle), 380 px/s extension, 560 px/s empty return,
60-second levels, and mole movement of 60–90 px/s starting at level two.
Strength also accelerates empty returns, as before.

## Remaining fidelity gaps

- Mines still use seeded procedural placement and a value budget, rather than
  reproducing historical layouts and their seven-level theme cycle.
- Early goals match the listed sequence. The quadratic continuation after those
  goals is unverified. The 4399 guide mentions a later 2075 increment and
  further changes, but does not provide a complete reliable goal table.
- Shop availability, price ranges and per-level increases are retained tuning.
- Bag probabilities remain 20% dynamite and 15% strength when not already
  strong; otherwise the strength outcome becomes cash. Clover changes cash
  amounts only. Precise distributions and a possible distinction between shop
  strength and bag strength need original-game verification.
- Collision shapes, radii, item positions, animal behavior, bone values, and
  diamond-carrying mole payouts have not been measured against the original.
- Dynamite acts immediately; no thrown-projectile travel time is modeled.

For further calibration, identify one original version and record its viewport
size, swing cycle, extension and empty-return times, and returns over equal
normalized distances for each item with and without strength. Use those
measurements before replacing the remaining estimates. Regression tests cover
payouts, heavy-haul timing, bag variation, and explosion chains; passing them
only establishes this implementation's behavior.
