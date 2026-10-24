import type { LaneDefinition, Vec } from "../content/types.ts";
import { clamp } from "./geometry.ts";

/**
 * A walkable road, ready for arc-length movement. The original moved enemies
 * from node to node; since the stored paths have a node every few pixels, we
 * move by distance instead and keep the distances the original's node indices
 * imply (see `engageAt`, `disengageAt`, `leakAt`).
 */
export interface Lane {
  points: Vec[];
  cumulative: number[];
  total: number;
  engageAt: number;
  disengageAt: number;
  leakAt: number;
  /** Average distance between the original path's nodes. */
  spacing: number;
}

export function createLane(definition: LaneDefinition): Lane {
  const points = definition.points.map(([x, y]) => ({ x, y }));
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(
      cumulative[i - 1] + Math.hypot(
        points[i].x - points[i - 1].x,
        points[i].y - points[i - 1].y,
      ),
    );
  }
  return {
    points,
    cumulative,
    total: cumulative[cumulative.length - 1],
    engageAt: definition.engageAt,
    disengageAt: definition.disengageAt,
    leakAt: definition.leakAt,
    spacing: definition.spacing,
  };
}

export function createLanes(
  definitions: readonly (readonly LaneDefinition[])[],
): Lane[][] {
  return definitions.map((path) => path.map(createLane));
}

/** Index of the segment containing `distance`; clamped to the road. */
export function segmentAt(lane: Lane, distance: number): number {
  const target = clamp(distance, 0, lane.total);
  let low = 0;
  let high = lane.cumulative.length - 1;
  while (low < high - 1) {
    const middle = (low + high) >> 1;
    if (lane.cumulative[middle] <= target) low = middle;
    else high = middle;
  }
  return low;
}

export function pointAt(lane: Lane, distance: number): Vec {
  const index = segmentAt(lane, distance);
  const start = lane.points[index];
  const end = lane.points[index + 1] ?? start;
  const segmentLength = lane.cumulative[index + 1] - lane.cumulative[index];
  if (segmentLength <= 0) return { x: start.x, y: start.y };
  const t = clamp((distance - lane.cumulative[index]) / segmentLength, 0, 1);
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

/** Heading in radians, pointing along increasing distance. */
export function headingAt(lane: Lane, distance: number): number {
  const index = segmentAt(lane, distance);
  const start = lane.points[index];
  const end = lane.points[index + 1] ?? start;
  return Math.atan2(end.y - start.y, end.x - start.x);
}
