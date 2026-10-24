import { assert, assertEquals } from "@std/assert";
import { levelById } from "../content/levels.ts";
import type { WaveDefinition } from "../content/types.ts";
import { tick } from "./simulation.ts";
import {
  callNextWave,
  canCallWave,
  countWaveGroups,
  earlyCallBonus,
  nextWaveCountdown,
  startFirstWave,
} from "./waves.ts";
import { createWorld } from "./world.ts";

function makeWorld(levelId = 1) {
  const level = levelById(levelId);
  assert(level, `level ${levelId} must exist`);
  return createWorld({ level, mode: "campaign", difficulty: "normal" });
}

function wave(interval: number): WaveDefinition {
  return { interval, pathIndex: 0, spawns: [] };
}

Deno.test("consecutive interval-0 waves count as one displayed wave", () => {
  assertEquals(countWaveGroups([]), 0);
  assertEquals(countWaveGroups([wave(800)]), 1);
  assertEquals(countWaveGroups([wave(800), wave(0), wave(0), wave(600)]), 2);
  assertEquals(countWaveGroups([wave(0), wave(0), wave(0)]), 1);
});

Deno.test("the first wave waits for the player to send it", () => {
  const world = makeWorld();
  assertEquals(world.totalWaves, countWaveGroups(world.modeData.waves));
  for (let i = 0; i < 90; i++) tick(world);
  assertEquals(world.activeWaves.length, 0);
  assertEquals(world.waveNumber, 0);
  assertEquals(nextWaveCountdown(world), null);
  assert(!canCallWave(world));

  assert(startFirstWave(world));
  assert(!world.waitingForStart);
  assertEquals(world.waveNumber, 1);
  assert(world.activeWaves.length > 0);
  assert(!startFirstWave(world), "the first wave only starts once");
});

Deno.test("calling the next wave early pays its remaining time", () => {
  const world = makeWorld();
  startFirstWave(world);
  // Pretend the first wave finished and the countdown is running.
  world.activeWaves = [];
  world.waveIndex = 1;
  world.waveCounter = 100;
  const next = world.modeData.waves[1];
  assert(next.interval > 100);

  assert(canCallWave(world));
  const bonus = earlyCallBonus(world);
  assertEquals(bonus, Math.round((next.interval - world.waveCounter) / 30));
  const cash = world.cash;
  assert(callNextWave(world));
  assertEquals(world.cash, cash + bonus);
  assertEquals(world.waveNumber, 2);
});

Deno.test("the wave flag stays hidden until the countdown nears its end", () => {
  const world = makeWorld();
  startFirstWave(world);
  world.activeWaves = [];
  world.waveIndex = 1;
  world.waveCounter = 0;
  assert(!canCallWave(world));
  const interval = world.modeData.waves[1].interval;
  world.waveCounter = interval - 20;
  assert(canCallWave(world));
  assertEquals(nextWaveCountdown(world), 20);
  world.waveCounter = interval - 2;
  assertEquals(nextWaveCountdown(world), 2);
});
