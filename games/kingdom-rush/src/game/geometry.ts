import type { Vec } from "../content/types.ts";

export function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * The original checks ranges against an axis-aligned ellipse (`Ellipse` from
 * casalib), so the same shape is used here.
 */
export function inEllipse(
  center: Vec,
  width: number,
  height: number,
  point: Vec,
): boolean {
  const rx = width / 2;
  const ry = height / 2;
  if (rx <= 0 || ry <= 0) return false;
  const dx = (point.x - center.x) / rx;
  const dy = (point.y - center.y) / ry;
  return dx * dx + dy * dy <= 1;
}

/** Normalised distance inside an ellipse: 1 on the edge, 0 at the centre. */
export function ellipseRatio(
  center: Vec,
  width: number,
  height: number,
  point: Vec,
): number {
  const rx = width / 2;
  const ry = height / 2;
  const dx = (point.x - center.x) / rx;
  const dy = (point.y - center.y) / ry;
  return Math.sqrt(dx * dx + dy * dy);
}
