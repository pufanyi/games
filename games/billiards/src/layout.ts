// Where the table sits on the canvas. The canvas has a fixed internal size and
// is scaled to fit; the table is in meters with y up, the canvas in pixels
// with y down.
import { TABLE } from "./physics/table.ts";

export const WIDTH = 1280;
export const HEIGHT = 720;

/** Pixels per meter. */
export const SCALE = 400;
/** Rubber cushion and wooden rail, outside the cushion nose, in meters. */
export const CUSHION_WIDTH = 0.045;
export const RAIL_WIDTH = 0.085;

const FRAME_HALF_HEIGHT = TABLE.width / 2 + CUSHION_WIDTH + RAIL_WIDTH;
export const CENTER_X = WIDTH / 2;
/** Leaves the top of the canvas for the HUD. */
export const CENTER_Y = HEIGHT - FRAME_HALF_HEIGHT * SCALE - 10;

export function toCanvas(x: number, y: number): [number, number] {
  return [CENTER_X + x * SCALE, CENTER_Y - y * SCALE];
}

export function toTable(px: number, py: number): [number, number] {
  return [(px - CENTER_X) / SCALE, (CENTER_Y - py) / SCALE];
}
