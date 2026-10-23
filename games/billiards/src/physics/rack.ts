import { type Ball, createBall } from "./ball.ts";
import { BALL_RADIUS as R } from "./constants.ts";
import { seededRandom } from "../random.ts";
import { TABLE, type Table } from "./table.ts";

/** A real rack is never perfectly tight; balls sit this far apart, ± jitter. */
const GAP = 0.00008;
const JITTER = 0.00002;

/**
 * Racks object balls in a triangle with its apex on the foot spot, row by row
 * toward the foot rail: `order[0]` at the apex, then the two balls of the
 * second row, and so on. The tiny gaps come from `seed`, so every break is
 * different but replays exactly.
 */
export function rack(order: number[], seed: number, table = TABLE): Ball[] {
  const random = seededRandom(seed);
  const spacing = 2 * R + GAP;
  const rowStep = spacing * Math.sqrt(0.75);
  const balls: Ball[] = [];
  let row = 0;
  let inRow = 0;
  for (const id of order) {
    const x = table.length / 4 + row * rowStep;
    const y = (inRow - row / 2) * spacing;
    balls.push(
      createBall(
        id,
        x + (random() * 2 - 1) * JITTER,
        y + (random() * 2 - 1) * JITTER,
      ),
    );
    if (++inRow > row) {
      row++;
      inRow = 0;
    }
  }
  return balls;
}

/** The head spot, where the cue ball starts for the break. */
export function headSpot(table: Table = TABLE): [number, number] {
  return [-table.length / 4, 0];
}
