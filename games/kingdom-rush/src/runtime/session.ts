// Everything outside the simulation that the game loop and the screens share:
// which screen is up, the running level, pause and speed, the current selection
// and aim mode, and saved progress. Plain TS so the loop can advance the world
// without React; the screens read a small `View` of it.
import { SELL_PERCENT, TICK_RATE } from "../game/constants.ts";
import {
  tierCap,
  TOWER_TREE,
  TOWER_TYPE_DESCRIPTIONS,
  TOWER_TYPE_NAMES,
} from "../content/tower_tree.ts";
import { TOWER_TIERS } from "../content/towers.ts";
import type { TowerType, Vec } from "../content/types.ts";
import {
  useFireball,
  useLightning,
  useReinforcements,
} from "../game/commands.ts";
import { tick } from "../game/simulation.ts";
import {
  buildTower,
  sellTower,
  setRally,
  towerStats,
  upgradeOptions,
  upgradeTower,
} from "../game/tower.ts";
import type {
  Difficulty,
  GameMode,
  Tower,
  World,
  WorldStatus,
} from "../game/types.ts";
import {
  callNextWave,
  canCallWave,
  earlyCallBonus,
  nextWaveCountdown,
  startFirstWave,
} from "../game/waves.ts";
import { createWorld, slotAt, towerAt } from "../game/world.ts";
import { levelById } from "../content/levels.ts";
import {
  cleared,
  loadProgress,
  nextLevelId,
  type Progress,
  recordWin,
  setDifficulty,
  unlocked,
} from "./progress.ts";

/** A power waiting for the player to pick a target on the field. */
export type Aim = "fireball" | "lightning" | "reinforcements" | "rally" | null;

export interface Session {
  screen: "select" | "game";
  levelId: number;
  mode: GameMode;
  difficulty: Difficulty;
  world: World | null;
  paused: boolean;
  /** Real seconds waiting to become simulation ticks. */
  pending: number;
  selectedSlotId: number | null;
  selectedTowerId: number | null;
  aim: Aim;
  /** Pointer position in world coordinates, for range previews. */
  pointer: Vec | null;
  hoveredSlotId: number | null;
  progress: Progress;
  /** The end-of-level result has already been written to progress. */
  outcomeSaved: boolean;
}

export interface PowerView {
  /** Present in this level's mode. */
  available: boolean;
  /** Cooldown has finished and nothing else blocks it. */
  ready: boolean;
  /** Whole seconds left on the cooldown; 0 when ready. */
  seconds: number;
}

export interface BuildOptionView {
  type: TowerType;
  name: string;
  description: string;
  cost: number;
  affordable: boolean;
}

export interface UpgradeView {
  key: string;
  name: string;
  description: string;
  cost: number;
  affordable: boolean;
}

export interface TowerView {
  id: number;
  name: string;
  level: number;
  description: string;
  sell: number;
  lines: string[];
  upgrades: UpgradeView[];
  canRally: boolean;
  building: boolean;
}

export interface WaveView {
  action: "start" | "send" | "wait";
  label: string;
  /** Gold the early call pays right now. */
  bonus: number;
}

/** What the React screens show. Changes rarely, unlike the world itself. */
export interface View {
  screen: Session["screen"];
  levelId: number;
  levelLabel: string;
  mode: GameMode;
  modeLabel: string;
  difficulty: Difficulty;
  status: WorldStatus | null;
  paused: boolean;
  speed: number;
  lives: number;
  maxLives: number;
  cash: number;
  kills: number;
  leaked: number;
  wave: number;
  totalWaves: number;
  waveView: WaveView;
  powers: {
    lightning: PowerView;
    fireball: PowerView;
    reinforcements: PowerView;
  };
  aim: Aim;
  buildOptions: BuildOptionView[];
  selectedSlotId: number | null;
  selectedTower: TowerView | null;
  progress: Progress;
  /** The next campaign stage to offer after a win, when it is unlocked. */
  nextLevel: number | null;
}

export function createSession(): Session {
  return {
    screen: "select",
    levelId: 1,
    mode: "campaign",
    difficulty: "normal",
    world: null,
    paused: false,
    pending: 0,
    selectedSlotId: null,
    selectedTowerId: null,
    aim: null,
    pointer: null,
    hoveredSlotId: null,
    progress: loadProgress(),
    outcomeSaved: false,
  };
}

export function chooseDifficulty(
  session: Session,
  difficulty: Difficulty,
): void {
  session.difficulty = difficulty;
  setDifficulty(session.progress, difficulty);
}

export function beginLevel(
  session: Session,
  levelId: number,
  mode: GameMode,
): boolean {
  const level = levelById(levelId);
  if (!level) return false;
  if (!unlocked(session.progress, levelId, mode)) return false;
  if (!level.modes[mode]) return false;
  session.levelId = levelId;
  session.mode = mode;
  session.world = createWorld({ level, mode, difficulty: session.difficulty });
  session.screen = "game";
  session.paused = false;
  session.pending = 0;
  session.selectedSlotId = null;
  session.selectedTowerId = null;
  session.aim = null;
  session.pointer = null;
  session.hoveredSlotId = null;
  session.outcomeSaved = false;
  return true;
}

export function retryLevel(session: Session): void {
  beginLevel(session, session.levelId, session.mode);
}

export function quitToSelect(session: Session): void {
  session.screen = "select";
  session.world = null;
  session.paused = false;
  session.pending = 0;
  session.selectedSlotId = null;
  session.selectedTowerId = null;
  session.aim = null;
  session.pointer = null;
  session.hoveredSlotId = null;
}

export function setSpeed(session: Session, speed: number): void {
  if (!session.world) return;
  session.world.speed = Math.max(1, Math.min(3, Math.round(speed)));
}

export function togglePause(session: Session, paused = !session.paused): void {
  session.paused = paused;
  if (paused) session.aim = null;
}

/** Pause and drop held aim state, e.g. when the tab loses focus. */
export function interrupt(session: Session): void {
  if (session.screen !== "game") return;
  session.paused = true;
  session.aim = null;
  session.pointer = null;
  session.hoveredSlotId = null;
}

function selectedTower(session: Session): Tower | null {
  const world = session.world;
  if (!world || session.selectedTowerId === null) return null;
  return world.towers.find((tower) => tower.id === session.selectedTowerId) ??
    null;
}

export function movePointer(session: Session, point: Vec | null): void {
  session.pointer = point;
  if (!point || !session.world) {
    session.hoveredSlotId = null;
    return;
  }
  const slot = slotAt(session.world, point);
  session.hoveredSlotId = slot && !slot.tower ? slot.id : null;
}

/** Cast whatever the player aimed, or select the tower or slot under the tap. */
export function pressPointer(session: Session, point: Vec): void {
  const world = session.world;
  if (world?.status !== "playing" || session.paused) return;

  if (session.aim) {
    castAim(session, point);
    return;
  }

  const tower = towerAt(world, point);
  if (tower) {
    session.selectedTowerId = tower.id;
    session.selectedSlotId = null;
    return;
  }
  const slot = slotAt(world, point);
  if (slot) {
    session.selectedSlotId = slot.tower ? null : slot.id;
    session.selectedTowerId = slot.tower ? slot.tower.id : null;
    return;
  }
  session.selectedSlotId = null;
  session.selectedTowerId = null;
}

function castAim(session: Session, point: Vec): void {
  const world = session.world;
  if (!world) return;
  let cast = false;
  switch (session.aim) {
    case "fireball":
      cast = useFireball(world, point.x, point.y);
      break;
    case "lightning":
      cast = useLightning(world, point.x, point.y);
      break;
    case "reinforcements":
      cast = useReinforcements(world, point.x, point.y);
      break;
    case "rally": {
      const tower = selectedTower(session);
      if (tower) cast = setRally(world, tower.id, point.x, point.y);
      break;
    }
    case null:
      break;
  }
  // A missed lightning strike keeps the power armed so the player can retry.
  if (cast) session.aim = null;
}

/** Arm a power for the next field tap; tapping the same button again cancels. */
export function setAim(session: Session, aim: Exclude<Aim, null>): void {
  const world = session.world;
  if (world?.status !== "playing" || session.paused) return;
  if (session.aim === aim) {
    session.aim = null;
    return;
  }
  switch (aim) {
    case "fireball":
      if (!world.available.fireball || world.powers.fireball > 0) return;
      break;
    case "reinforcements":
      if (!world.available.reinforcements || world.powers.reinforcements > 0) {
        return;
      }
      break;
    case "lightning":
      if (world.powers.lightning > 0) return;
      break;
    case "rally": {
      const tower = selectedTower(session);
      if (tower?.type !== "barracks") return;
      break;
    }
  }
  session.aim = aim;
}

export function build(session: Session, type: TowerType): void {
  const world = session.world;
  if (!world || session.selectedSlotId === null) return;
  const tower = buildTower(world, session.selectedSlotId, type);
  if (!tower) return;
  session.selectedSlotId = null;
  session.selectedTowerId = tower.id;
}

export function upgrade(session: Session, tier: string): void {
  const world = session.world;
  if (!world || session.selectedTowerId === null) return;
  upgradeTower(world, session.selectedTowerId, tier);
}

export function sell(session: Session): void {
  const world = session.world;
  if (!world || session.selectedTowerId === null) return;
  if (sellTower(world, session.selectedTowerId)) {
    session.selectedTowerId = null;
  }
}

/** Start the first wave, or call the next one early for its gold bonus. */
export function sendWave(session: Session): void {
  const world = session.world;
  if (world?.status !== "playing") return;
  if (world.waitingForStart) {
    startFirstWave(world);
    return;
  }
  callNextWave(world);
}

/** Fixed-step advance: real seconds in, up to three ticks per step at 3x. */
export function advance(session: Session, seconds: number): void {
  const world = session.world;
  if (!world || session.screen !== "game" || session.paused) return;
  if (world.status !== "playing") {
    finish(session);
    return;
  }
  session.pending += Math.min(seconds, 0.25);
  const step = 1 / TICK_RATE;
  while (session.pending >= step) {
    session.pending -= step;
    for (let i = 0; i < world.speed && world.status === "playing"; i++) {
      tick(world);
    }
    if (world.status !== "playing") {
      session.pending = 0;
      break;
    }
  }
  finish(session);
}

function finish(session: Session): void {
  const world = session.world;
  if (!world || world.status === "playing" || session.outcomeSaved) return;
  session.outcomeSaved = true;
  if (world.status === "won") {
    recordWin(session.progress, session.levelId, session.mode);
  }
}

/* ------------------------------------------------------------------ views */

const MODE_LABELS: Record<GameMode, string> = {
  campaign: "Campaign",
  heroic: "Heroic",
  iron: "Iron",
};

function powerView(
  ticks: number,
  available: boolean,
): PowerView {
  return {
    available,
    ready: available && ticks <= 0,
    seconds: Math.max(0, Math.ceil(ticks / TICK_RATE)),
  };
}

function statLines(type: TowerType, level: number, tower: Tower): string[] {
  const stats = tower.stats;
  const lines: string[] = [];
  if (stats.minDamage !== undefined) {
    const max = stats.maxDamage ?? stats.minDamage;
    lines.push(
      stats.minDamage === max
        ? `Damage ${max}`
        : `Damage ${stats.minDamage}–${max}`,
    );
  }
  if (stats.range !== undefined) lines.push(`Range ${stats.range}`);
  if (stats.reload !== undefined) {
    lines.push(`Reload ${(stats.reload / TICK_RATE).toFixed(1)}s`);
  }
  if (stats.area !== undefined) {
    lines.push(`Blast ${stats.area}×${Math.round((stats.area * 2) / 3)}`);
  }
  if (stats.health !== undefined) {
    const alive = tower.soldiers.filter((soldier) =>
      soldier.state !== "dead"
    ).length;
    lines.push(
      `Soldiers ${alive}/${tower.soldiers.length} · ${stats.health} HP`,
    );
  }
  if (stats.armor !== undefined && stats.armor > 0) {
    lines.push(`Armor ${stats.armor}%`);
  }
  if (type === "barracks" && stats.rangeRally !== undefined) {
    lines.push(`Rally range ${stats.rangeRally} (level ${level})`);
  }
  return lines;
}

function towerView(world: World, tower: Tower): TowerView {
  const info = TOWER_TREE[tower.type].find((tier) => tier.key === tower.tier);
  const name = info?.name ?? TOWER_TYPE_NAMES[tower.type];
  return {
    id: tower.id,
    name,
    level: tower.level,
    description: info?.description ?? "",
    sell: Math.round(tower.invested * SELL_PERCENT),
    lines: statLines(tower.type, tower.level, tower),
    upgrades: upgradeOptions(world, tower).map((option) => {
      const cost = towerStats(tower.type, option.key)?.cost ?? 0;
      return {
        key: option.key,
        name: option.name,
        description: option.description,
        cost,
        affordable: world.cash >= cost,
      };
    }),
    canRally: tower.type === "barracks",
    building: tower.buildTicks > 0,
  };
}

function buildOptions(world: World): BuildOptionView[] {
  return (Object.keys(TOWER_TYPE_NAMES) as TowerType[])
    .filter((type) => tierCap(world.unlockCaps[type]) >= 1)
    .map((type) => {
      const cost = TOWER_TIERS[type].level1?.cost ?? 0;
      return {
        type,
        name: TOWER_TYPE_NAMES[type],
        description: TOWER_TYPE_DESCRIPTIONS[type],
        cost,
        affordable: world.cash >= cost,
      };
    });
}

function waveView(world: World): WaveView {
  if (world.waitingForStart) {
    return { action: "start", label: "Start wave", bonus: 0 };
  }
  if (canCallWave(world)) {
    const bonus = earlyCallBonus(world);
    return {
      action: "send",
      label: bonus > 0 ? `Send wave +${bonus}` : "Send wave",
      bonus,
    };
  }
  const countdown = nextWaveCountdown(world);
  if (countdown !== null) {
    const seconds = Math.ceil(countdown / TICK_RATE);
    return { action: "wait", label: `Next wave ${seconds}s`, bonus: 0 };
  }
  if (world.waveIndex >= world.modeData.waves.length) {
    return { action: "wait", label: "Last wave", bonus: 0 };
  }
  return { action: "wait", label: "Wave incoming", bonus: 0 };
}

export function viewOf(session: Session): View {
  const world = session.world;
  const progress = session.progress;
  const level = levelById(session.levelId);
  const next = nextLevelId(session.levelId);
  const base: View = {
    screen: session.screen,
    levelId: session.levelId,
    levelLabel: level ? `Level ${level.id}` : "",
    mode: session.mode,
    modeLabel: MODE_LABELS[session.mode],
    difficulty: session.difficulty,
    status: null,
    paused: session.paused,
    speed: 1,
    lives: 0,
    maxLives: 0,
    cash: 0,
    kills: 0,
    leaked: 0,
    wave: 0,
    totalWaves: 0,
    waveView: { action: "start", label: "Start wave", bonus: 0 },
    powers: {
      lightning: { available: true, ready: false, seconds: 0 },
      fireball: { available: false, ready: false, seconds: 0 },
      reinforcements: { available: false, ready: false, seconds: 0 },
    },
    aim: session.aim,
    buildOptions: [],
    selectedSlotId: session.selectedSlotId,
    selectedTower: null,
    progress,
    nextLevel: next && cleared(progress, session.levelId, "campaign")
      ? next
      : null,
  };
  if (!world || session.screen !== "game") return base;

  const tower = selectedTower(session);
  return {
    ...base,
    status: world.status,
    paused: session.paused,
    speed: world.speed,
    lives: world.lives,
    maxLives: world.maxLives,
    cash: world.cash,
    kills: world.stats.kills,
    leaked: world.stats.leaked,
    wave: world.waveNumber,
    totalWaves: world.totalWaves,
    waveView: waveView(world),
    powers: {
      lightning: powerView(world.powers.lightning, true),
      fireball: powerView(world.powers.fireball, world.available.fireball),
      reinforcements: powerView(
        world.powers.reinforcements,
        world.available.reinforcements,
      ),
    },
    buildOptions: session.selectedSlotId === null ? [] : buildOptions(world),
    selectedTower: tower ? towerView(world, tower) : null,
  };
}

/** Cheap change check so React re-renders only when the HUD actually differs. */
export function sameView(a: View, b: View): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
