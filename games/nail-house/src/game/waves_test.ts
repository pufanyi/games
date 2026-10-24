import { assertEquals } from "@std/assert";
import { ENEMIES } from "./catalog.ts";
import { ENEMY_ENTRANCE_YS } from "./config.ts";
import { purchase } from "./shop.ts";
import { createGame, step } from "./sim.ts";

Deno.test("purchases do not change enemy entrances or stopping distances", () => {
  const empty = createGame(1);
  const defended = createGame(1);
  purchase(defended, "grandma");
  for (const state of [empty, defended]) {
    state.waves = [{
      enemy: "grunt",
      startTime: 0,
      interval: 0,
      min: 0,
      count: 6,
      remaining: 6,
      cd: 0,
    }];
  }
  // All six arrive before the leading enemy reaches firing range.
  for (let tick = 0; tick < 6; tick++) {
    step(empty);
    step(defended);
    assertEquals(
      empty.enemies.at(-1)?.y,
      ENEMY_ENTRANCE_YS[tick % ENEMY_ENTRANCE_YS.length],
    );
    assertEquals(empty.enemies.at(-1)?.range, ENEMIES.grunt.range);
    assertEquals(
      empty.enemies.map(({ x, y, vx, vy, range }) => ({ x, y, vx, vy, range })),
      defended.enemies.map(({ x, y, vx, vy, range }) => ({
        x,
        y,
        vx,
        vy,
        range,
      })),
    );
  }
});

Deno.test("waves wait for their start and accelerate only to their minimum", () => {
  const state = createGame(1);
  state.waves = [{
    enemy: "grunt",
    startTime: 2,
    interval: 4,
    min: 2,
    count: 4,
    remaining: 4,
    cd: 0,
  }];
  const arrivals: number[] = [];
  for (let tick = 0; tick < 20; tick++) {
    const before = state.spawns;
    step(state);
    if (state.spawns > before) arrivals.push(state.tick);
  }
  assertEquals(arrivals, [3, 7, 10, 13]);
  assertEquals(state.waves[0].remaining, 0);
  assertEquals(state.waves[0].interval, 2);
});
