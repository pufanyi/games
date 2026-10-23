import { AI_DELAY } from "../content/catalog.ts";
import { blastCells, opposite } from "./combat.ts";
import {
  BOX,
  cell,
  COLS,
  DIRECTIONS,
  index,
  random,
  sameCell,
  tile,
  VECTORS,
} from "./types.ts";
import type { Direction, Input, Player, Point, State } from "./types.ts";
interface Window {
  start: number;
  end: number;
}
export function dangerMap(s: State): Map<number, Window[]> {
  const danger = new Map<number, Window[]>();
  const add = (p: Point, start: number, end: number) => {
    const i = index(p.x, p.y);
    danger.set(i, [...(danger.get(i) ?? []), { start, end }]);
  };
  const times = s.bombs.map((b) => b.fuse);
  const cells = s.bombs.map((b) => blastCells(s, b, b.power));
  for (let pass = 0; pass < s.bombs.length; pass++) {
    for (let i = 0; i < s.bombs.length; i++) {
      for (let j = 0; j < s.bombs.length; j++) {
        if (
          times[j] > times[i] && cells[i].some((p) => sameCell(p, s.bombs[j]))
        ) times[j] = times[i];
      }
    }
  }
  for (let i = 0; i < cells.length; i++) {
    for (const p of cells[i]) add(p, times[i], times[i] + 18);
  }
  for (const f of s.fire) if (f.kind !== "water") add(f, 0, f.ttl);
  return danger;
}
function blocked(s: State, p: Point, start: Point): boolean {
  return tile(s, p.x, p.y) !== 0 ||
    (!sameCell(p, start) && s.bombs.some((b) => sameCell(b, p)));
}
function search(
  s: State,
  p: Player,
  goal: (c: Point) => boolean,
  danger: Map<number, Window[]>,
  escaping: boolean,
): Direction | null {
  const start = cell(p);
  const queue: { pos: Point; first: Direction | null; steps: number }[] = [{
    pos: start,
    first: null,
    steps: 0,
  }];
  const seen = new Set([index(start.x, start.y)]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current.steps > 0 && goal(current.pos)) return current.first;
    for (const direction of DIRECTIONS) {
      const slide = s.features.find((f) =>
        f.kind === "WaterSlide" && sameCell(f, current.pos)
      );
      if (slide && direction === opposite[slide.direction]) continue;
      const v = VECTORS[direction],
        next = { x: current.pos.x + v.x, y: current.pos.y + v.y },
        i = index(next.x, next.y);
      if (blocked(s, next, start) || seen.has(i)) continue;
      const arrival = (current.steps + 1) * 9;
      const hazard = danger.get(i) ?? [];
      if (hazard.some((w) => w.start <= arrival + 5 && w.end >= arrival - 7)) {
        continue;
      }
      if (!escaping && hazard.length) continue;
      seen.add(i);
      queue.push({
        pos: next,
        first: current.first ?? direction,
        steps: current.steps + 1,
      });
    }
  }
  return null;
}
function hasEscape(s: State, p: Player): boolean {
  const simulated = {
    ...s,
    bombs: [...s.bombs, {
      ...cell(p),
      id: -1,
      owner: p.id,
      fuse: 62,
      power: p.power,
      pass: [p.id],
      direction: null,
      slide: 0,
    }],
  };
  const danger = dangerMap(simulated);
  return search(
    simulated,
    p,
    (c) => !danger.has(index(c.x, c.y)),
    danger,
    true,
  ) !== null;
}
export function aiInput(s: State, p: Player): Input {
  const danger = dangerMap(s),
    current = cell(p),
    here = index(current.x, current.y);
  const threatened = danger.has(here);
  const onSlide = s.features.some((f) =>
    f.kind === "WaterSlide" && sameCell(f, p)
  );
  const centered = Math.abs(p.x - current.x) + Math.abs(p.y - current.y) < 0.16;
  if (!onSlide && p.moving && p.aiDirection && !centered && p.stuck < 3) {
    return {
      direction: p.aiDirection,
      action: p.weapon === "water" && p.aiAction,
    };
  }
  if (!onSlide && !threatened && s.tick < p.aiNext && p.stuck < 3) {
    return {
      direction: p.aiDirection,
      action: p.weapon === "water" && p.aiAction,
    };
  }
  p.aiNext = s.tick + AI_DELAY[s.settings.mode][s.settings.difficulty];
  p.aiAction = false;
  if (threatened) {
    p.aiDirection = search(
      s,
      p,
      (c) => !danger.has(index(c.x, c.y)),
      danger,
      true,
    );
    return { direction: p.aiDirection, action: false };
  }
  const targets = s.players.filter((other) =>
    other !== p && other.alive && (s.settings.mode !== "arcade" || other.human)
  );
  const inSight = targets.find((other) => {
    const target = cell(other),
      dx = target.x - current.x,
      dy = target.y - current.y;
    if (dx && dy) return false;
    const range = p.weapon === "hammer"
      ? 1
      : p.weapon === "bomb"
      ? p.power
      : p.weapon === "water"
      ? 5
      : 10;
    if (Math.abs(dx) + Math.abs(dy) > range) return false;
    for (let n = 1; n < Math.abs(dx) + Math.abs(dy); n++) {
      if (
        tile(
          s,
          current.x + Math.sign(dx) * n,
          current.y + Math.sign(dy) * n,
        ) !== 0
      ) return false;
    }
    p.direction = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
    return true;
  });
  if (inSight && p.weapon !== "bomb" && s.settings.mode !== "race") {
    p.aiAction = true;
    p.aiDirection = null;
    return { direction: null, action: true };
  }
  const nearBox = DIRECTIONS.some((d) =>
    tile(s, current.x + VECTORS[d].x, current.y + VECTORS[d].y) === BOX
  );
  if (
    p.weapon === "bomb" && (nearBox || inSight) &&
    s.bombs.filter((b) => b.owner === p.id).length < p.capacity &&
    hasEscape(s, p)
  ) {
    p.aiDirection = null;
    return { direction: null, action: true };
  }
  if (nearBox && p.weapon === "hammer") {
    p.direction = DIRECTIONS.find((d) =>
      tile(s, current.x + VECTORS[d].x, current.y + VECTORS[d].y) === BOX
    ) ?? p.direction;
    p.aiDirection = null;
    return { direction: null, action: true };
  }
  if (s.settings.mode === "race") {
    const route = s.routes[p.character],
      target = route[p.checkpoints % route.length];
    p.aiDirection = target
      ? search(s, p, (c) => sameCell(c, target), danger, false)
      : null;
  } else {
    p.aiDirection = search(
      s,
      p,
      (c) => s.pickups.some((item) => !item.delay && sameCell(item, c)),
      danger,
      false,
    );
    if (!p.aiDirection) {
      p.aiDirection = search(
        s,
        p,
        (c) =>
          targets.some((t) =>
            Math.abs(t.x - c.x) + Math.abs(t.y - c.y) < 1.2
          ) || (p.weapon === "bomb" && DIRECTIONS.some((d) =>
            tile(s, c.x + VECTORS[d].x, c.y + VECTORS[d].y) === BOX
          )),
        danger,
        false,
      );
    }
  }
  if (!p.aiDirection) {
    const safe = DIRECTIONS.filter((d) => {
      const v = VECTORS[d], n = { x: current.x + v.x, y: current.y + v.y };
      return !blocked(s, n, current) && !danger.has(index(n.x, n.y));
    });
    p.aiDirection = safe.length
      ? safe[Math.floor(random(s) * safe.length)]
      : null;
  }
  return {
    direction: p.aiDirection,
    action: s.settings.mode === "race" && !!inSight,
  };
}
export function reachable(s: State, start: Point): Set<number> {
  const found = new Set<number>([index(start.x, start.y)]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    for (const d of DIRECTIONS) {
      const v = VECTORS[d],
        next = { x: queue[i].x + v.x, y: queue[i].y + v.y },
        n = index(next.x, next.y);
      if (!found.has(n) && tile(s, next.x, next.y) === 0) {
        found.add(n);
        queue.push(next);
      }
    }
  }
  return found;
}
export const pointFromIndex = (i: number) => ({
  x: i % COLS,
  y: Math.floor(i / COLS),
});
