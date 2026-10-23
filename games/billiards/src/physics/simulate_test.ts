import { assert, assertEquals } from "@std/assert";
import { type Ball, createBall } from "./ball.ts";
import { CUSHION_REACH } from "./collide.ts";
import { BALL_RADIUS as R } from "./constants.ts";
import { headSpot, rack } from "./rack.ts";
import { simulateShot } from "./simulate.ts";
import { seededRandom } from "../random.ts";
import { TABLE } from "./table.ts";

const TOLERANCE = 1e-5;
const ORDER = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];

function racked(seed: number): Ball[] {
  const [x, y] = headSpot();
  return [createBall(0, x, y), ...rack(ORDER, seed)];
}

/** The table's outline: rails and jaws, closed across the far end of each pocket. */
const OUTLINE = TABLE.cushions.flatMap((c, i) =>
  i % 3 === 0
    ? [[c.ax, c.ay], [c.bx, c.by]]
    : i % 3 === 1
    ? [[c.bx, c.by], [c.ax, c.ay]]
    : []
);

function inside(x: number, y: number): boolean {
  let crossings = 0;
  for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
    const [xi, yi] = OUTLINE[i];
    const [xj, yj] = OUTLINE[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      crossings++;
    }
  }
  return crossings % 2 === 1;
}

function distanceToCushion(x: number, y: number): number {
  let best = Infinity;
  for (const c of TABLE.cushions) {
    const ex = c.bx - c.ax;
    const ey = c.by - c.ay;
    const t = Math.min(
      1,
      Math.max(0, ((x - c.ax) * ex + (y - c.ay) * ey) / (ex * ex + ey * ey)),
    );
    best = Math.min(best, Math.hypot(c.ax + t * ex - x, c.ay + t * ey - y));
  }
  return best;
}

Deno.test("a break spreads the rack and everything comes to rest", () => {
  const result = simulateShot(racked(1), {
    cue: [1, 0, 0],
    speed: 8,
    tip: [0, 0],
  });
  const moved = result.balls.filter((b, i) =>
    b.id !== 0 && Math.hypot(b.x - racked(1)[i].x, b.y - racked(1)[i].y) > 0.1
  );
  assert(moved.length >= 10, `${moved.length} balls moved`);
  assert(result.balls.every((b) => b.vx === 0 && b.vy === 0 && b.wz === 0));
  assert(result.duration > 1 && result.duration < 30);
});

Deno.test("hard shots never push a ball through a cushion or another ball", () => {
  const random = seededRandom(3);
  for (let seed = 0; seed < 30; seed++) {
    const angle = (random() - 0.5) * 0.2;
    const result = simulateShot(racked(seed), {
      cue: [Math.cos(angle), Math.sin(angle), -random() * 0.3],
      speed: 4 + random() * 5,
      tip: [(random() - 0.5) * 0.8, (random() - 0.5) * 0.8],
    });
    const onTable = result.balls.filter((b) => b.motion !== "pocketed");
    // Collisions are found along straight paths within each step, so balls
    // frozen together can end up overlapping by around a micrometer.
    for (const ball of onTable) {
      assert(inside(ball.x, ball.y), `seed ${seed}: ball ${ball.id} escaped`);
      assert(distanceToCushion(ball.x, ball.y) > CUSHION_REACH - TOLERANCE);
    }
    for (const a of onTable) {
      for (const b of onTable) {
        if (a.id < b.id) {
          assert(Math.hypot(a.x - b.x, a.y - b.y) > 2 * R - TOLERANCE);
        }
      }
    }
    const times = result.events.map((e) => e.t);
    assertEquals(times, [...times].sort((a, b) => a - b));
  }
});

Deno.test("a straight shot into a corner pockets the ball", () => {
  // Object ball on the diagonal into the top-right corner (pocket 3).
  const balls = [createBall(0, 0.6, 0), createBall(1, 0.9, 0.3)];
  const result = simulateShot(balls, {
    cue: [1, 1, 0],
    speed: 2,
    tip: [0, 0],
  });
  const potted = result.events.filter((e) => e.type === "pocket");
  assertEquals(potted.map((e) => [e.ball, e.pocket]), [[1, 3]]);
});

Deno.test("the same shot always plays out identically", () => {
  const shot = {
    cue: [0.98, 0.02, -0.1],
    speed: 7.5,
    tip: [0.2, -0.3],
  } as const;
  const first = simulateShot(racked(5), {
    ...shot,
    cue: [...shot.cue],
    tip: [...shot.tip],
  });
  const second = simulateShot(racked(5), {
    ...shot,
    cue: [...shot.cue],
    tip: [...shot.tip],
  });
  assertEquals(JSON.stringify(first), JSON.stringify(second));
});

Deno.test("simulating doesn't change the balls passed in", () => {
  const balls = racked(2);
  const before = JSON.stringify(balls);
  simulateShot(balls, { cue: [1, 0, 0], speed: 8, tip: [0, 0] });
  assertEquals(JSON.stringify(balls), before);
});

Deno.test("frames cover the whole shot, in order", () => {
  const result = simulateShot(racked(4), {
    cue: [1, 0, 0],
    speed: 6,
    tip: [0, 0],
  });
  const times = result.frames.map((f) => f.t);
  assertEquals(times[0], 0);
  assertEquals(times.at(-1), result.duration);
  assertEquals(times, [...times].sort((a, b) => a - b));
  assert(result.frames.every((f) => f.balls.length === 16));
});
