import type { WaveDefinition } from "../content/types.ts";
import { WAVE_FLAG_LEAD } from "./constants.ts";
import { spawnEnemy } from "./enemy.ts";
import type { SpawnRuntime, WaveRuntime, World } from "./types.ts";

/** Number of displayed wave groups: consecutive `interval: 0` waves merge. */
export function countWaveGroups(waves: readonly WaveDefinition[]): number {
  let groups = 0;
  for (let i = 0; i < waves.length; i++) {
    groups++;
    while (i + 1 < waves.length && waves[i + 1].interval === 0) i++;
  }
  return groups;
}

function createWave(def: WaveDefinition): WaveRuntime {
  return {
    def,
    spawns: def.spawns.map((spawn) => ({
      enemy: spawn.enemy,
      aux: spawn.aux,
      maxSame: spawn.maxSame,
      count: spawn.count,
      interval: spawn.interval,
      delay: spawn.delay,
      fixedPath: spawn.fixedPath ?? false,
      path: spawn.path,
      indexCant: 1,
      intervalCounter: 0,
      indexSwap: 0,
      currentType: spawn.enemy,
    })),
    indexSpawn: 0,
    waitingBetween: false,
    waitCounter: 0,
    done: false,
  };
}

/** Launch the wave at `waveIndex` plus every following `interval: 0` wave. */
function launch(world: World): void {
  const waves = world.modeData.waves;
  if (world.waveIndex >= waves.length) return;
  world.activeWaves.push(createWave(waves[world.waveIndex]));
  world.waveIndex++;
  while (
    world.waveIndex < waves.length &&
    waves[world.waveIndex].interval === 0
  ) {
    world.activeWaves.push(createWave(waves[world.waveIndex]));
    world.waveIndex++;
  }
  world.waveNumber++;
  world.waveCounter = 0;
}

/** Called when the player sends the first wave from the sign on the road. */
export function startFirstWave(world: World): boolean {
  if (!world.waitingForStart || world.status !== "playing") return false;
  world.waitingForStart = false;
  launch(world);
  return true;
}

/** The countdown shown on the wave flag, in ticks. */
export function nextWaveCountdown(world: World): number | null {
  if (world.waitingForStart) return null;
  if (world.activeWaves.length > 0) return null;
  const next = world.modeData.waves[world.waveIndex];
  if (!next || next.interval === 0) return null;
  return Math.max(0, next.interval - world.waveCounter);
}

/** Whether the next wave's flag is on screen and clickable. */
export function canCallWave(world: World): boolean {
  if (world.waitingForStart || world.activeWaves.length > 0) return false;
  const next = world.modeData.waves[world.waveIndex];
  if (!next || next.interval === 0) return false;
  return world.waveCounter >= WAVE_FLAG_LEAD &&
    world.waveCounter <= next.interval;
}

/** Gold the early-call bonus would pay right now, as in the original. */
export function earlyCallBonus(world: World): number {
  const next = world.modeData.waves[world.waveIndex];
  if (!next) return 0;
  return Math.max(0, Math.round((next.interval - world.waveCounter) / 30));
}

/** Send the next wave before its countdown ends, collecting the bonus. */
export function callNextWave(world: World): boolean {
  if (!canCallWave(world) || world.status !== "playing") return false;
  world.cash += earlyCallBonus(world);
  world.stats.earned += earlyCallBonus(world);
  launch(world);
  return true;
}

function updateSpawn(
  world: World,
  wave: WaveRuntime,
  spawn: SpawnRuntime,
): boolean {
  if (spawn.indexCant > spawn.count) return true;

  spawn.intervalCounter++;
  if (spawn.intervalCounter < spawn.interval) return false;
  spawn.intervalCounter = 0;

  if (spawn.aux) {
    if (spawn.indexSwap === (spawn.maxSame ?? 1)) {
      spawn.currentType = spawn.currentType === spawn.aux
        ? spawn.enemy
        : spawn.aux;
      spawn.indexSwap = 0;
    }
  } else {
    spawn.currentType = spawn.enemy;
  }
  spawnEnemy(
    world,
    spawn.currentType,
    wave.def.pathIndex,
    spawn.fixedPath ? spawn.path : undefined,
  );
  spawn.indexSwap++;
  spawn.indexCant++;
  return false;
}

function updateWave(world: World, wave: WaveRuntime): void {
  const spawn = wave.spawns[wave.indexSpawn];
  if (!spawn || wave.done) return;

  if (wave.waitingBetween) {
    wave.waitCounter++;
    if (wave.waitCounter >= spawn.delay) {
      wave.waitingBetween = false;
      wave.waitCounter = 0;
      wave.indexSpawn++;
      if (wave.indexSpawn >= wave.spawns.length) wave.done = true;
    }
    return;
  }

  const finished = updateSpawn(world, wave, spawn);
  if (!finished) return;
  if (wave.indexSpawn + 1 >= wave.spawns.length) {
    wave.done = true;
  } else {
    wave.waitingBetween = true;
    wave.waitCounter = 0;
  }
}

/** Advance the wave state machine; called once per simulation tick. */
export function updateWaves(world: World): void {
  if (world.waitingForStart) return;

  if (world.activeWaves.length === 0) {
    if (world.waveIndex >= world.modeData.waves.length) return;
    const next = world.modeData.waves[world.waveIndex];
    if (world.waveCounter >= next.interval) {
      launch(world);
    } else {
      world.waveCounter++;
    }
  }

  for (const wave of world.activeWaves) updateWave(world, wave);
  world.activeWaves = world.activeWaves.filter((wave) => !wave.done);
}
