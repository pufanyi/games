// Table geometry: a 9 ft table to WPA specifications. The origin is the center
// of the playing surface; x runs along the table, y across it, both in meters,
// measured at the cushion noses.

/** A straight stretch of cushion nose, from (ax, ay) to (bx, by). */
export interface Cushion {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** The hole in the slate: a ball whose center is over it drops. */
export interface Pocket {
  x: number;
  y: number;
  radius: number;
}

export interface Table {
  length: number;
  width: number;
  /** Rails and pocket jaws, in order around the table. */
  cushions: Cushion[];
  /** Counterclockwise from the bottom-left corner. */
  pockets: Pocket[];
}

interface PocketShape {
  /** Half the distance between the jaw points. */
  halfMouth: number;
  /**
   * How much each jaw angles in toward the other, as a slope against the
   * pocket's axis. WPA's 142° corner and 104° side jaw angles are 7° and 14°.
   */
  narrowing: number;
  /** How far each jaw runs back; far enough to end over the hole. */
  jawLength: number;
  /** From the mouth to the edge of the hole. */
  shelf: number;
  holeRadius: number;
}

const CORNER: PocketShape = {
  halfMouth: 0.057,
  narrowing: 0.1228,
  jawLength: 0.09,
  shelf: 0.04,
  holeRadius: 0.06,
};

const SIDE: PocketShape = {
  halfMouth: 0.0645,
  narrowing: 0.2493,
  jawLength: 0.05,
  shelf: 0.006,
  holeRadius: 0.065,
};

export function createTable(length = 2.54, width = 1.27): Table {
  const l = length / 2;
  const w = width / 2;
  const d = Math.SQRT1_2;
  // Each pocket: where its axis meets the table's outline, the axis pointing
  // out of the table, and its shape. Corners sit diagonally on the corner of
  // the outline, so their mouth is in front of it.
  const layout: [number, number, number, number, PocketShape][] = [
    [-l, -w, -d, -d, CORNER],
    [0, -w, 0, -1, SIDE],
    [l, -w, d, -d, CORNER],
    [l, w, d, d, CORNER],
    [0, w, 0, 1, SIDE],
    [-l, w, -d, d, CORNER],
  ];

  const pockets: Pocket[] = [];
  const jaws: { enter: Cushion; leave: Cushion }[] = [];
  for (const [cx, cy, ux, uy, shape] of layout) {
    const inset = shape === CORNER ? shape.halfMouth : 0;
    const mx = cx - inset * ux;
    const my = cy - inset * uy;
    // Along the mouth, counterclockwise around the table.
    const px = -uy;
    const py = ux;
    const h = shape.halfMouth;
    const depth = shape.shelf + shape.holeRadius;
    pockets.push({
      x: mx + depth * ux,
      y: my + depth * uy,
      radius: shape.holeRadius,
    });
    jaws.push({
      enter: jaw(mx - h * px, my - h * py, ux, uy, px, py, shape),
      leave: jaw(mx + h * px, my + h * py, ux, uy, -px, -py, shape),
    });
  }

  // Each pocket's jaws, then the rail on to the next pocket.
  const cushions: Cushion[] = [];
  for (let i = 0; i < jaws.length; i++) {
    const { enter, leave } = jaws[i];
    const next = jaws[(i + 1) % jaws.length].enter;
    cushions.push(enter, leave, {
      ax: leave.ax,
      ay: leave.ay,
      bx: next.ax,
      by: next.ay,
    });
  }
  return { length, width, cushions, pockets };
}

/** A jaw from its point on the mouth, angling toward (inx, iny). */
function jaw(
  x: number,
  y: number,
  ux: number,
  uy: number,
  inx: number,
  iny: number,
  shape: PocketShape,
): Cushion {
  const dx = ux + shape.narrowing * inx;
  const dy = uy + shape.narrowing * iny;
  const scale = shape.jawLength / Math.sqrt(dx * dx + dy * dy);
  return { ax: x, ay: y, bx: x + dx * scale, by: y + dy * scale };
}

export const TABLE = createTable();
