import type { EnemyDefinition, TowerType, Vec } from "../content/types.ts";
import type {
  Effect,
  Enemy,
  Projectile,
  Soldier,
  Tower,
  World,
} from "../game/types.ts";
import { RANGE_RATIO, TOWER_Y_OFFSET } from "../game/constants.ts";
import { themeFor } from "./theme.ts";

const FONT = '"Lilita One", "Trebuchet MS", sans-serif';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  ratio: number,
): void {
  const clamped = Math.max(0, Math.min(1, ratio));
  ctx.fillStyle = "rgba(10, 12, 8, 0.7)";
  roundRect(ctx, x - width / 2 - 1, y - 1, width + 2, 5, 2);
  ctx.fill();
  ctx.fillStyle = clamped > 0.55
    ? "#6ddc5a"
    : clamped > 0.25
    ? "#e3c44a"
    : "#e15b46";
  roundRect(ctx, x - width / 2, y, width * clamped, 3, 1.5);
  ctx.fill();
}

const TOWER_COLORS: Record<
  TowerType,
  { roof: string; wall: string; trim: string }
> = {
  archer: { roof: "#4f7f43", wall: "#b8a179", trim: "#7a5c36" },
  mage: { roof: "#5b4a9e", wall: "#9a93bd", trim: "#463a78" },
  engineer: { roof: "#7d5a3a", wall: "#a98f6e", trim: "#5f4127" },
  barracks: { roof: "#8a4b3d", wall: "#b9a78c", trim: "#6b3a2f" },
};

const SPECIAL_ROOFS: Record<string, string> = {
  ranger: "#3f7b3a",
  musketeer: "#3a5f8a",
  arcane: "#6d6dff",
  sorcerer: "#4c9a54",
  bfg: "#5f5f63",
  tesla: "#7fd0e0",
  paladin: "#d8c67a",
  barbarian: "#a83f2f",
};

function towerHeight(tower: Tower): number {
  return 30 + tower.level * 4;
}

export function drawTower(
  ctx: CanvasRenderingContext2D,
  tower: Tower,
  tick: number,
): void {
  const colors = TOWER_COLORS[tower.type];
  const roof = SPECIAL_ROOFS[tower.tier] ?? colors.roof;
  const building = tower.buildTicks > 0;
  const height = towerHeight(tower);
  ctx.save();
  ctx.translate(tower.x, tower.y);
  if (building) {
    const progress = 1 - tower.buildTicks / 30;
    ctx.globalAlpha = 0.35 + progress * 0.4;
  }

  // Shadow.
  ctx.fillStyle = "rgba(15, 22, 12, 0.28)";
  ctx.beginPath();
  ctx.ellipse(2, 4, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (tower.type === "barracks") {
    drawBarracks(ctx, tower, height, roof, colors, tick, building);
  } else if (tower.type === "engineer") {
    drawEngineer(ctx, tower, height, roof, colors, building);
  } else if (tower.type === "mage") {
    drawMage(ctx, tower, height, roof, colors, tick, building);
  } else {
    drawArcher(ctx, tower, height, roof, colors, tick, building);
  }

  if (building) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(250, 226, 150, 0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(
      0,
      -18,
      24,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * (1 - tower.buildTicks / 30),
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawArcher(
  ctx: CanvasRenderingContext2D,
  tower: Tower,
  height: number,
  roof: string,
  colors: { wall: string; trim: string },
  tick: number,
  building: boolean,
): void {
  const width = 20 + tower.level * 2;
  // Stone footing.
  ctx.fillStyle = colors.trim;
  ctx.fillRect(-width / 2 - 1, -6, width + 2, 8);
  ctx.fillStyle = colors.wall;
  ctx.fillRect(-width / 2, -height, width, height - 6);
  // Wooden bands.
  ctx.fillStyle = colors.trim;
  ctx.fillRect(-width / 2, -height + 6, width, 2);
  ctx.fillRect(-width / 2, -height / 2, width, 2);
  // Roof.
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-width / 2 - 4, -height);
  ctx.lineTo(0, -height - 16 - tower.level);
  ctx.lineTo(width / 2 + 4, -height);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Window.
  ctx.fillStyle = "#241d15";
  ctx.beginPath();
  ctx.arc(0, -height + 10, 3, 0, Math.PI * 2);
  ctx.fill();
  if (!building) {
    // Two archers with bows; they bob gently.
    const bob = Math.sin(tick * 0.08) * 0.8;
    ctx.fillStyle = "#3e4a2a";
    for (const side of [-1, 1]) {
      const x = side * (width / 2 - 2);
      ctx.beginPath();
      ctx.arc(x, -height - 2 + bob, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#6b4a2c";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x + side * 3, -height - 2 + bob, 5, -1.2, 1.2);
      ctx.stroke();
    }
  }
}

function drawMage(
  ctx: CanvasRenderingContext2D,
  tower: Tower,
  height: number,
  roof: string,
  colors: { wall: string; trim: string },
  tick: number,
  building: boolean,
): void {
  const width = 18 + tower.level * 2;
  ctx.fillStyle = colors.trim;
  ctx.fillRect(-width / 2 - 2, -8, width + 4, 10);
  ctx.fillStyle = colors.wall;
  ctx.fillRect(-width / 2, -height, width, height - 8);
  // Tapered top.
  ctx.fillStyle = colors.wall;
  ctx.beginPath();
  ctx.moveTo(-width / 2, -height);
  ctx.lineTo(-width / 2 + 3, -height - 12);
  ctx.lineTo(width / 2 - 3, -height - 12);
  ctx.lineTo(width / 2, -height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-width / 2 - 1, -height - 10);
  ctx.lineTo(0, -height - 26);
  ctx.lineTo(width / 2 + 1, -height - 10);
  ctx.closePath();
  ctx.fill();
  if (!building) {
    const pulse = 0.75 + Math.sin(tick * 0.12) * 0.25;
    const orbY = -height - 34 - tower.level;
    ctx.save();
    ctx.globalAlpha = 0.35 * pulse;
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.arc(0, orbY, 11 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#f5f1ff";
    ctx.beginPath();
    ctx.arc(0, orbY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = roof;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, orbY, 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEngineer(
  ctx: CanvasRenderingContext2D,
  tower: Tower,
  height: number,
  roof: string,
  colors: { wall: string; trim: string },
  building: boolean,
): void {
  const width = 22 + tower.level * 2;
  ctx.fillStyle = colors.trim;
  ctx.fillRect(-width / 2, -10, width, 12);
  ctx.fillStyle = colors.wall;
  ctx.fillRect(-width / 2 + 2, -height + 4, width - 4, height - 12);
  ctx.fillStyle = colors.trim;
  ctx.fillRect(-width / 2, -height + 4, width, 4);

  // Barrel points to the right; Big Bertha gets a wider one.
  const big = tower.tier === "bfg" || tower.tier === "tesla";
  ctx.save();
  ctx.translate(0, -height - 2);
  ctx.rotate(-0.35);
  ctx.fillStyle = big ? "#3d3d44" : "#5a4a3a";
  roundRect(ctx, -3, -5, big ? 30 : 24, big ? 12 : 10, 4);
  ctx.fill();
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (tower.tier === "tesla" && !building) {
    ctx.strokeStyle = "#bfe9f4";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, -height - 14);
    ctx.lineTo(-4, -height - 24);
    ctx.lineTo(-7, -height - 22);
    ctx.lineTo(-3, -height - 32);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(9, -height - 12);
    ctx.lineTo(13, -height - 22);
    ctx.lineTo(10, -height - 20);
    ctx.lineTo(14, -height - 30);
    ctx.stroke();
  } else if (!building) {
    // A crew member next to the gun.
    ctx.fillStyle = "#b26a3c";
    ctx.beginPath();
    ctx.arc(-width / 2 - 3, -12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#42506b";
    ctx.fillRect(-width / 2 - 5, -8, 4, 8);
  }
}

function drawBarracks(
  ctx: CanvasRenderingContext2D,
  tower: Tower,
  height: number,
  roof: string,
  colors: { wall: string; trim: string },
  tick: number,
  building: boolean,
): void {
  const width = 30 + tower.level * 2;
  ctx.fillStyle = colors.wall;
  roundRect(ctx, -width / 2, -height + 2, width, height - 4, 3);
  ctx.fill();
  ctx.fillStyle = colors.trim;
  ctx.fillRect(-width / 2, -8, width, 8);
  // Roof.
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-width / 2 - 4, -height + 4);
  ctx.lineTo(0, -height - 16);
  ctx.lineTo(width / 2 + 4, -height + 4);
  ctx.closePath();
  ctx.fill();
  // Door and windows.
  ctx.fillStyle = "#3a2a1d";
  roundRect(ctx, -5, -13, 10, 11, 2);
  ctx.fill();
  ctx.fillStyle = "#e8c96a";
  roundRect(ctx, -width / 2 + 4, -height + 10, 4, 5, 1);
  ctx.fill();
  roundRect(ctx, width / 2 - 8, -height + 10, 4, 5, 1);
  ctx.fill();
  // Banner.
  if (!building) {
    const wave = Math.sin(tick * 0.08) * 2;
    ctx.strokeStyle = "#4a3520";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 + 8, -height - 10);
    ctx.lineTo(width / 2 + 8, -height - 24);
    ctx.stroke();
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(width / 2 + 8, -height - 24);
    ctx.lineTo(width / 2 + 20 + wave, -height - 20);
    ctx.lineTo(width / 2 + 8, -height - 15);
    ctx.closePath();
    ctx.fill();
  }
}

/* ------------------------------------------------------------------ enemies */

type LookKind =
  | "goblin"
  | "orc"
  | "human"
  | "knight"
  | "undead"
  | "demon"
  | "beast"
  | "spider"
  | "construct";

interface Look {
  kind: LookKind;
  skin: string;
  cloth: string;
  accent: string;
  metal: string;
}

const LOOKS: Record<string, Look> = {
  goblin: {
    kind: "goblin",
    skin: "#6fae4a",
    cloth: "#5a4630",
    accent: "#c9a25a",
    metal: "#9aa0a4",
  },
  goblinChieftain: {
    kind: "goblin",
    skin: "#79b34f",
    cloth: "#7a3a2a",
    accent: "#e0c060",
    metal: "#c0c6c8",
  },
  goblinZapper: {
    kind: "goblin",
    skin: "#6fae4a",
    cloth: "#42506b",
    accent: "#8fd3e8",
    metal: "#b8c0c6",
  },
  fatOrc: {
    kind: "orc",
    skin: "#6b9c48",
    cloth: "#6a4a33",
    accent: "#c9a25a",
    metal: "#a0a5a8",
  },
  orcArmored: {
    kind: "orc",
    skin: "#6b9c48",
    cloth: "#4c4f57",
    accent: "#aab0b4",
    metal: "#bcc2c6",
  },
  ogre: {
    kind: "orc",
    skin: "#7ca354",
    cloth: "#5b4530",
    accent: "#d8b46a",
    metal: "#a8adb1",
  },
  forestTroll: {
    kind: "orc",
    skin: "#5c8a4a",
    cloth: "#4a3a28",
    accent: "#9fc46a",
    metal: "#9aa0a4",
  },
  troll: {
    kind: "orc",
    skin: "#5c8a4a",
    cloth: "#4a3a28",
    accent: "#c9a25a",
    metal: "#9aa0a4",
  },
  trollAxeThrower: {
    kind: "orc",
    skin: "#5c8a4a",
    cloth: "#4a3a28",
    accent: "#a8b0b4",
    metal: "#b0b6ba",
  },
  trollChieftain: {
    kind: "orc",
    skin: "#5c8a4a",
    cloth: "#6a2f23",
    accent: "#e0c060",
    metal: "#b0b6ba",
  },
  yeti: {
    kind: "beast",
    skin: "#e6ecef",
    cloth: "#b9c6cc",
    accent: "#8fb6c8",
    metal: "#c8d0d4",
  },
  yetiBoss: {
    kind: "beast",
    skin: "#eef3f5",
    cloth: "#9fb4bd",
    accent: "#7cc0d6",
    metal: "#c8d0d4",
  },
  bandit: {
    kind: "human",
    skin: "#d9a476",
    cloth: "#6b4a33",
    accent: "#c9a25a",
    metal: "#9aa0a4",
  },
  bossBandit: {
    kind: "human",
    skin: "#d9a476",
    cloth: "#3d3d44",
    accent: "#e0c060",
    metal: "#c0c6c8",
  },
  brigand: {
    kind: "human",
    skin: "#d9a476",
    cloth: "#5b4a3a",
    accent: "#b98a4a",
    metal: "#a8adb1",
  },
  marauder: {
    kind: "human",
    skin: "#c99568",
    cloth: "#5a3c2c",
    accent: "#c9a25a",
    metal: "#a8adb1",
  },
  pillager: {
    kind: "human",
    skin: "#c99568",
    cloth: "#6a4a33",
    accent: "#b98a4a",
    metal: "#b0b6ba",
  },
  raider: {
    kind: "human",
    skin: "#c99568",
    cloth: "#4a3a2c",
    accent: "#c9a25a",
    metal: "#a8adb1",
  },
  slayer: {
    kind: "human",
    skin: "#c99568",
    cloth: "#3d3d44",
    accent: "#b0453a",
    metal: "#bcc2c6",
  },
  darkKnight: {
    kind: "knight",
    skin: "#5b5b64",
    cloth: "#2f3138",
    accent: "#b0453a",
    metal: "#c8ced2",
  },
  rocketeer: {
    kind: "human",
    skin: "#d9a476",
    cloth: "#5a4a3a",
    accent: "#e08b3a",
    metal: "#b0b6ba",
  },
  shadowArcher: {
    kind: "human",
    skin: "#8f8fa8",
    cloth: "#3a3a4c",
    accent: "#9a7ad0",
    metal: "#a8adb1",
  },
  skeleton: {
    kind: "undead",
    skin: "#e4e0d0",
    cloth: "#5a4a6a",
    accent: "#8f7fb0",
    metal: "#b0b6ba",
  },
  skeletonBig: {
    kind: "undead",
    skin: "#e4e0d0",
    cloth: "#4a3a5a",
    accent: "#a89ac0",
    metal: "#c0c6c8",
  },
  zombie: {
    kind: "undead",
    skin: "#9aa46a",
    cloth: "#4a4a3a",
    accent: "#7a8a5a",
    metal: "#9aa0a4",
  },
  necromancer: {
    kind: "undead",
    skin: "#b9b3c9",
    cloth: "#3f3550",
    accent: "#8f5fd0",
    metal: "#a8adb1",
  },
  theThing: {
    kind: "undead",
    skin: "#8a9a6a",
    cloth: "#3a3a2c",
    accent: "#8fc46a",
    metal: "#9aa0a4",
  },
  rottenBoss: {
    kind: "undead",
    skin: "#7a8a5a",
    cloth: "#3a2f2a",
    accent: "#a0c060",
    metal: "#9aa0a4",
  },
  rottenSpider: {
    kind: "spider",
    skin: "#6a7a4a",
    cloth: "#3a3a2c",
    accent: "#a0c060",
    metal: "#9aa0a4",
  },
  rottenTree: {
    kind: "construct",
    skin: "#6a5a3a",
    cloth: "#3a2f22",
    accent: "#8fc46a",
    metal: "#8a7a5a",
  },
  demon: {
    kind: "demon",
    skin: "#c0503a",
    cloth: "#5a2020",
    accent: "#f0a03a",
    metal: "#a8adb1",
  },
  demonImp: {
    kind: "demon",
    skin: "#d0604a",
    cloth: "#5a2020",
    accent: "#f0a03a",
    metal: "#a8adb1",
  },
  demonMage: {
    kind: "demon",
    skin: "#b04a5a",
    cloth: "#3f2050",
    accent: "#c96ae0",
    metal: "#a8adb1",
  },
  demonWolf: {
    kind: "beast",
    skin: "#a8453a",
    cloth: "#5a2020",
    accent: "#f0a03a",
    metal: "#a8adb1",
  },
  gargoyle: {
    kind: "demon",
    skin: "#7a7a86",
    cloth: "#4a4a55",
    accent: "#a8c0d0",
    metal: "#a8adb1",
  },
  lavaElemental: {
    kind: "demon",
    skin: "#c04a2a",
    cloth: "#5a2010",
    accent: "#f0c03a",
    metal: "#a8adb1",
  },
  veznan: {
    kind: "demon",
    skin: "#a04a5a",
    cloth: "#3f2050",
    accent: "#d0a0e0",
    metal: "#c0c6c8",
  },
  sarelgaz: {
    kind: "spider",
    skin: "#5a4a6a",
    cloth: "#2f2538",
    accent: "#b07ad0",
    metal: "#9aa0a4",
  },
  sarelgazSmall: {
    kind: "spider",
    skin: "#6a5a7a",
    cloth: "#3f3548",
    accent: "#c08ae0",
    metal: "#9aa0a4",
  },
  wolf: {
    kind: "beast",
    skin: "#8a8f96",
    cloth: "#5a5f66",
    accent: "#c8ced2",
    metal: "#a8adb1",
  },
  wolfSmall: {
    kind: "beast",
    skin: "#9a9fa6",
    cloth: "#6a6f76",
    accent: "#c8ced2",
    metal: "#a8adb1",
  },
  whiteWolf: {
    kind: "beast",
    skin: "#e6ecef",
    cloth: "#b0bcc2",
    accent: "#8fd3e8",
    metal: "#c8d0d4",
  },
  orcWolfRider: {
    kind: "beast",
    skin: "#8a8f96",
    cloth: "#5c7a3a",
    accent: "#c9a25a",
    metal: "#a8adb1",
  },
  spider: {
    kind: "spider",
    skin: "#4a4a55",
    cloth: "#2f2f3a",
    accent: "#b0453a",
    metal: "#9aa0a4",
  },
  spiderSmall: {
    kind: "spider",
    skin: "#5a5a65",
    cloth: "#3a3a45",
    accent: "#b0453a",
    metal: "#9aa0a4",
  },
  spiderTiny: {
    kind: "spider",
    skin: "#6a6a75",
    cloth: "#4a4a55",
    accent: "#b0453a",
    metal: "#9aa0a4",
  },
  spiderTinyRotten: {
    kind: "spider",
    skin: "#6a7a4a",
    cloth: "#3a3a2c",
    accent: "#a0c060",
    metal: "#9aa0a4",
  },
  golemHead: {
    kind: "construct",
    skin: "#8a8a86",
    cloth: "#5a5a55",
    accent: "#8fd3e8",
    metal: "#b0b6ba",
  },
  juggernaut: {
    kind: "construct",
    skin: "#7a7a74",
    cloth: "#4a4a44",
    accent: "#e08b3a",
    metal: "#c0c6c8",
  },
};

function lookFor(key: string): Look {
  return LOOKS[key] ??
    {
      kind: "human",
      skin: "#c9a476",
      cloth: "#5a4a3a",
      accent: "#c9a25a",
      metal: "#a8adb1",
    };
}

function enemyScale(enemy: Enemy): number {
  const base = enemy.def.size === 2 ? 1.5 : enemy.def.size === 1 ? 1.18 : 0.94;
  return base * (enemy.def.isBoss ? 1.5 : 1);
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  tick: number,
): void {
  const look = lookFor(enemy.key);
  const scale = enemyScale(enemy);
  const flying = enemy.def.isFlying;
  const dead = enemy.state === "dead";
  const fade = dead
    ? Math.max(0, 1 - enemy.deadTicks / Math.max(1, enemy.def.deadTime))
    : 1;
  const bob = dead ? 0 : Math.sin((enemy.distance + tick) * 0.16) * 1.4;
  const x = enemy.x;
  const y = enemy.y - (flying ? 16 : 0) + bob;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(x, y);
  if (dead) {
    ctx.rotate(Math.min(1.2, enemy.deadTicks * 0.06));
    ctx.scale(1, 0.7);
  }
  ctx.scale(enemy.facing, 1);
  ctx.scale(scale, scale);

  // Ground shadow, separate for flyers.
  ctx.save();
  ctx.scale(1 / scale, 1 / scale);
  ctx.fillStyle = flying ? "rgba(10, 15, 10, 0.18)" : "rgba(10, 15, 10, 0.28)";
  ctx.beginPath();
  ctx.ellipse(
    0,
    flying ? 20 : 1,
    flying ? 10 : 12,
    flying ? 4 : 5,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  if (flying) {
    drawWings(ctx, look, tick);
  }

  switch (look.kind) {
    case "beast":
      drawBeast(ctx, look, tick);
      break;
    case "spider":
      drawSpider(ctx, look, tick);
      break;
    default:
      drawHumanoid(ctx, look, enemy, tick);
      break;
  }

  if (enemy.charging) {
    ctx.strokeStyle = "rgba(240, 120, 90, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -12, 10, -1.2, 0.6);
    ctx.stroke();
  }

  ctx.restore();

  if (!dead && (enemy.hp < enemy.maxHp || enemy.def.isBoss)) {
    drawHealthBar(
      ctx,
      enemy.x,
      enemy.y - (flying ? 40 : 32) * scale - 4,
      26 * Math.min(scale, 1.4),
      enemy.hp / enemy.maxHp,
    );
  }
}

function drawWings(
  ctx: CanvasRenderingContext2D,
  look: Look,
  tick: number,
): void {
  const flap = Math.sin(tick * 0.25) * 0.4;
  ctx.fillStyle = look.cloth;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.rotate(-0.3 + flap);
    ctx.beginPath();
    ctx.moveTo(4, -14);
    ctx.quadraticCurveTo(20, -26, 26, -12);
    ctx.quadraticCurveTo(18, -14, 14, -6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawHumanoid(
  ctx: CanvasRenderingContext2D,
  look: Look,
  enemy: Enemy,
  tick: number,
): void {
  const walk = Math.sin((enemy.distance + tick) * 0.5) * 2;
  // Legs.
  ctx.strokeStyle = look.cloth;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-3, -8);
  ctx.lineTo(-4 + walk * 0.4, 0);
  ctx.moveTo(3, -8);
  ctx.lineTo(4 - walk * 0.4, 0);
  ctx.stroke();
  // Torso.
  ctx.fillStyle = look.cloth;
  roundRect(ctx, -6, -17, 12, 11, 3);
  ctx.fill();
  // Arm and weapon.
  ctx.strokeStyle = look.skin;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(5, -14);
  ctx.lineTo(10, -10);
  ctx.stroke();
  ctx.strokeStyle = look.metal;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(10, -10);
  ctx.lineTo(16, -19);
  ctx.stroke();
  // Head.
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(0, -21, 6, 0, Math.PI * 2);
  ctx.fill();
  // Eyes.
  ctx.fillStyle = look.kind === "demon" ? "#ffe36a" : "#2a2a2a";
  ctx.beginPath();
  ctx.arc(2, -22, 1.1, 0, Math.PI * 2);
  ctx.arc(5, -22, 1.1, 0, Math.PI * 2);
  ctx.fill();
  // Headgear.
  if (look.kind === "knight") {
    ctx.fillStyle = look.metal;
    roundRect(ctx, -6, -28, 12, 9, 3);
    ctx.fill();
    ctx.fillStyle = "#22252a";
    ctx.fillRect(0, -24, 6, 2);
  } else if (look.kind === "goblin") {
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.moveTo(-5, -23);
    ctx.lineTo(-12, -28);
    ctx.lineTo(-5, -19);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(5, -23);
    ctx.lineTo(12, -28);
    ctx.lineTo(5, -19);
    ctx.closePath();
    ctx.fill();
  } else if (look.kind === "orc") {
    ctx.fillStyle = "#f0ead8";
    ctx.beginPath();
    ctx.moveTo(2, -21);
    ctx.lineTo(4, -18);
    ctx.lineTo(5, -21);
    ctx.closePath();
    ctx.fill();
  } else if (look.kind === "undead") {
    ctx.fillStyle = "#2a2030";
    ctx.beginPath();
    ctx.arc(0, -24, 6, Math.PI, 0);
    ctx.fill();
  } else if (look.kind === "demon") {
    ctx.strokeStyle = "#2a1010";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -26);
    ctx.lineTo(-7, -32);
    ctx.moveTo(4, -26);
    ctx.lineTo(7, -32);
    ctx.stroke();
  }
  if (enemy.def.isBoss) {
    ctx.fillStyle = "#f6d34a";
    ctx.beginPath();
    ctx.moveTo(-6, -29);
    ctx.lineTo(-4, -35);
    ctx.lineTo(0, -31);
    ctx.lineTo(4, -35);
    ctx.lineTo(6, -29);
    ctx.closePath();
    ctx.fill();
  }
  if (enemy.def.armor > 0 && look.kind !== "knight") {
    ctx.fillStyle = look.metal;
    roundRect(ctx, -7, -15, 14, 5, 2);
    ctx.fill();
  }
}

function drawBeast(
  ctx: CanvasRenderingContext2D,
  look: Look,
  tick: number,
): void {
  const walk = Math.sin(tick * 0.4) * 2;
  ctx.fillStyle = look.skin;
  // Body.
  ctx.beginPath();
  ctx.ellipse(0, -10, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.beginPath();
  ctx.arc(12, -14, 6, 0, Math.PI * 2);
  ctx.fill();
  // Ears.
  ctx.beginPath();
  ctx.moveTo(9, -19);
  ctx.lineTo(10, -24);
  ctx.lineTo(13, -19);
  ctx.fill();
  // Tail.
  ctx.strokeStyle = look.skin;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-12, -12);
  ctx.quadraticCurveTo(-20, -18, -18, -22);
  ctx.stroke();
  // Legs.
  ctx.strokeStyle = look.cloth;
  ctx.lineWidth = 2.5;
  for (const [lx, phase] of [[-8, 0], [6, 1]] as const) {
    ctx.beginPath();
    ctx.moveTo(lx, -6);
    ctx.lineTo(lx + (phase ? walk : -walk), 0);
    ctx.stroke();
  }
  // Eyes.
  ctx.fillStyle = "#ffe36a";
  ctx.beginPath();
  ctx.arc(14, -15, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpider(
  ctx: CanvasRenderingContext2D,
  look: Look,
  tick: number,
): void {
  ctx.strokeStyle = look.skin;
  ctx.lineWidth = 1.8;
  const wiggle = Math.sin(tick * 0.5) * 2;
  for (let i = 0; i < 4; i++) {
    const y = -10 + i * 2;
    const spread = 13 + i * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(
      spread * 0.7,
      y - 4,
      spread,
      y - 2 + wiggle * (i % 2 ? 1 : -1),
    );
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const y = -10 + i * 2;
    const spread = -13 - i * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(
      spread * 0.7,
      y - 4,
      spread,
      y - 2 - wiggle * (i % 2 ? 1 : -1),
    );
    ctx.stroke();
  }
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.ellipse(-4, -11, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.cloth;
  ctx.beginPath();
  ctx.arc(6, -12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff5a3a";
  ctx.beginPath();
  ctx.arc(7, -13, 1, 0, Math.PI * 2);
  ctx.arc(9, -12, 1, 0, Math.PI * 2);
  ctx.arc(6, -11, 1, 0, Math.PI * 2);
  ctx.fill();
}

/* ----------------------------------------------------------------- soldiers */

const SOLDIER_COLORS: Record<
  TowerType,
  { cloth: string; armor: string; shield: string }
> = {
  archer: { cloth: "#4f7f43", armor: "#c8b98a", shield: "#6b4a2c" },
  mage: { cloth: "#5b4a9e", armor: "#c9c2e0", shield: "#463a78" },
  engineer: { cloth: "#a06a3a", armor: "#c8b98a", shield: "#6b4a2c" },
  barracks: { cloth: "#4a6a9a", armor: "#c0c6c8", shield: "#3a5a8a" },
};

export function drawSoldier(
  ctx: CanvasRenderingContext2D,
  soldier: Soldier,
  tick: number,
): void {
  if (soldier.state === "dead") return;
  const colors = SOLDIER_COLORS[soldier.tower?.type ?? "barracks"];
  const scale = soldier.level >= 4 ? 1.12 : 1;
  const fighting = soldier.state === "fighting";
  const swing = soldier.charging
    ? Math.sin(
      (soldier.chargeCounter / Math.max(1, soldier.chargeTicks)) * Math.PI,
    )
    : 0;
  ctx.save();
  ctx.translate(soldier.x, soldier.y);
  ctx.fillStyle = "rgba(10, 15, 10, 0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 1, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(soldier.facing * scale, scale);

  // Legs.
  ctx.strokeStyle = "#3a3a44";
  ctx.lineWidth = 2.2;
  const walk = fighting ? 0 : Math.sin((tick + soldier.id * 9) * 0.35) * 1.5;
  ctx.beginPath();
  ctx.moveTo(-2, -7);
  ctx.lineTo(-2 + walk, 0);
  ctx.moveTo(2, -7);
  ctx.lineTo(2 - walk, 0);
  ctx.stroke();
  // Tunic.
  ctx.fillStyle = colors.cloth;
  roundRect(ctx, -4.5, -14, 9, 8, 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = "#e0b48a";
  ctx.beginPath();
  ctx.arc(0, -17, 3.6, 0, Math.PI * 2);
  ctx.fill();
  // Helmet.
  ctx.fillStyle = colors.armor;
  ctx.beginPath();
  ctx.arc(0, -18.5, 3.9, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-3.9, -18.5, 7.8, 1.4);
  // Shield.
  ctx.fillStyle = colors.shield;
  ctx.beginPath();
  ctx.ellipse(-5, -10, 3.2, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colors.armor;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Weapon arm.
  ctx.strokeStyle = "#e0b48a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(3, -12);
  ctx.lineTo(6 + swing * 4, -13 - swing * 4);
  ctx.stroke();
  ctx.strokeStyle = "#d8dde0";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(6 + swing * 4, -13 - swing * 4);
  ctx.lineTo(11 + swing * 5, -17 - swing * 5);
  ctx.stroke();
  ctx.restore();

  if (soldier.hp < soldier.maxHp) {
    drawHealthBar(
      ctx,
      soldier.x,
      soldier.y - 26 * scale,
      14,
      soldier.hp / soldier.maxHp,
    );
  }
}

/* ------------------------------------------------------------- projectiles */

export function drawProjectile(
  ctx: CanvasRenderingContext2D,
  projectile: Projectile,
): void {
  switch (projectile.kind) {
    case "arrow": {
      const angle = Math.atan2(
        projectile.vy + projectile.tick * 1,
        projectile.vx,
      );
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(angle);
      ctx.strokeStyle = "#6b4a2c";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();
      ctx.fillStyle = "#d8dde0";
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(3, -2.2);
      ctx.lineTo(3, 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#e8e0c8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(-9, -2);
      ctx.moveTo(-7, 0);
      ctx.lineTo(-9, 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "bolt": {
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 11);
      glow.addColorStop(0, "rgba(220, 210, 255, 0.95)");
      glow.addColorStop(0.4, "rgba(150, 120, 240, 0.7)");
      glow.addColorStop(1, "rgba(90, 70, 200, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f5f1ff";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "bomb": {
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(projectile.tick * 0.4);
      ctx.fillStyle = "#2f2f35";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c9a25a";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(3, -3);
      ctx.lineTo(6, -7);
      ctx.stroke();
      ctx.fillStyle = "#f0a03a";
      ctx.beginPath();
      ctx.arc(6, -7, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "fireball": {
      if (projectile.delay > 0) break;
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
      glow.addColorStop(0, "rgba(255, 240, 180, 0.95)");
      glow.addColorStop(0.4, "rgba(240, 140, 40, 0.8)");
      glow.addColorStop(1, "rgba(200, 60, 20, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd36a";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
  }
}

/* ----------------------------------------------------------------- effects */

export function drawEffect(
  ctx: CanvasRenderingContext2D,
  effect: Effect,
): void {
  const progress = effect.age / Math.max(1, effect.life);
  const alpha = 1 - progress;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  switch (effect.kind) {
    case "hit": {
      ctx.strokeStyle = "#ffe9a8";
      ctx.lineWidth = 1.6;
      const radius = effect.radius * (0.5 + progress);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + effect.id;
        ctx.beginPath();
        ctx.moveTo(
          effect.x + Math.cos(angle) * radius * 0.4,
          effect.y + Math.sin(angle) * radius * 0.4,
        );
        ctx.lineTo(
          effect.x + Math.cos(angle) * radius,
          effect.y + Math.sin(angle) * radius,
        );
        ctx.stroke();
      }
      break;
    }
    case "miss": {
      ctx.fillStyle = "#d8dde0";
      ctx.font = `10px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("MISS", effect.x, effect.y - progress * 10);
      break;
    }
    case "coin": {
      const rise = progress * 16;
      ctx.fillStyle = "#f6d34a";
      ctx.beginPath();
      ctx.arc(effect.x - 7, effect.y - rise, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff6d0";
      ctx.font = `11px ${FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(`+${effect.radius}`, effect.x - 1, effect.y - rise + 4);
      break;
    }
    case "explosion": {
      const radius = effect.radius * (0.4 + progress * 0.9);
      const glow = ctx.createRadialGradient(
        effect.x,
        effect.y,
        1,
        effect.x,
        effect.y,
        radius,
      );
      glow.addColorStop(0, "rgba(255, 240, 190, 0.9)");
      glow.addColorStop(0.5, "rgba(240, 130, 40, 0.55)");
      glow.addColorStop(1, "rgba(180, 60, 20, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "fireball": {
      const radius = effect.radius * (0.5 + progress);
      ctx.strokeStyle = "#f0a03a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(
        effect.x,
        effect.y,
        radius,
        radius * RANGE_RATIO,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      break;
    }
    case "lightning": {
      ctx.strokeStyle = "#fff6c8";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#8fd3e8";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(effect.x + 8, effect.y - 170);
      let y = effect.y - 150;
      let x = effect.x + 8;
      while (y < effect.y - 10) {
        y += 22;
        x += Math.sin(effect.id + y) * 14;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(effect.x, effect.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }
    case "levelup": {
      ctx.strokeStyle = "#f6d34a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y - 20, 10 + progress * 26, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- overlays */

export interface OverlayState {
  hoveredSlotId: number | null;
  selectedTowerId: number | null;
  buildType: TowerType | null;
  aiming: "fireball" | "lightning" | "reinforcements" | "rally" | null;
  pointer: Vec | null;
}

function drawRange(
  ctx: CanvasRenderingContext2D,
  center: Vec,
  width: number,
  height: number,
  color: string,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.restore();
}

export function rallyPole(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tick: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#4a3520";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -20);
  ctx.stroke();
  const wave = Math.sin(tick * 0.1) * 2;
  ctx.fillStyle = "#4a6a9a";
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(12 + wave, -16);
  ctx.lineTo(0, -11);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawOverlays(
  ctx: CanvasRenderingContext2D,
  world: World,
  state: OverlayState,
  tick: number,
): void {
  // Hovered empty slot.
  if (state.hoveredSlotId !== null) {
    const slot = world.slots.find((item) => item.id === state.hoveredSlotId);
    if (slot) {
      ctx.save();
      ctx.strokeStyle = "#ffe9a8";
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(slot.x, slot.y - 2, 22, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  const selected = state.selectedTowerId === null
    ? null
    : world.towers.find((tower) => tower.id === state.selectedTowerId) ?? null;

  if (selected) {
    drawRange(
      ctx,
      { x: selected.x, y: selected.y + TOWER_Y_OFFSET },
      selected.rangeWidth,
      selected.rangeHeight,
      "#ffe9a8",
    );
    if (selected.type === "barracks") {
      const rally = selected.rally;
      drawRange(
        ctx,
        { x: rally.x, y: rally.y + 10 },
        selected.stats.rangeRally ?? 230,
        (selected.stats.rangeRally ?? 230) * RANGE_RATIO,
        "#8fd3e8",
      );
      rallyPole(ctx, rally.x, rally.y, tick);
      for (const soldier of selected.soldiers) {
        if (soldier.state === "dead") continue;
        ctx.fillStyle = "rgba(143, 211, 232, 0.7)";
        ctx.beginPath();
        ctx.arc(soldier.post.x, soldier.post.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const pointer = state.pointer;
  if (!pointer) return;
  if (state.aiming === "fireball") {
    drawRange(
      ctx,
      pointer,
      100,
      100 * RANGE_RATIO,
      "#f0a03a",
    );
  } else if (state.aiming === "lightning") {
    ctx.save();
    ctx.strokeStyle = "#8fd3e8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 16, 0, Math.PI * 2);
    ctx.moveTo(pointer.x - 22, pointer.y);
    ctx.lineTo(pointer.x - 10, pointer.y);
    ctx.moveTo(pointer.x + 10, pointer.y);
    ctx.lineTo(pointer.x + 22, pointer.y);
    ctx.moveTo(pointer.x, pointer.y - 22);
    ctx.lineTo(pointer.x, pointer.y - 10);
    ctx.moveTo(pointer.x, pointer.y + 10);
    ctx.lineTo(pointer.x, pointer.y + 22);
    ctx.stroke();
    ctx.restore();
  } else if (state.aiming === "reinforcements") {
    ctx.save();
    ctx.strokeStyle = "#8fd3e8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(143, 211, 232, 0.35)";
    ctx.beginPath();
    ctx.arc(pointer.x - 7, pointer.y - 7, 4, 0, Math.PI * 2);
    ctx.arc(pointer.x + 7, pointer.y + 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (state.aiming === "rally") {
    ctx.save();
    ctx.strokeStyle = "#8fd3e8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 12, 0, Math.PI * 2);
    ctx.moveTo(pointer.x - 18, pointer.y);
    ctx.lineTo(pointer.x + 18, pointer.y);
    ctx.moveTo(pointer.x, pointer.y - 18);
    ctx.lineTo(pointer.x, pointer.y + 18);
    ctx.stroke();
    ctx.restore();
  } else if (state.buildType) {
    // Ghost of the tower that would be built on the hovered slot.
    const slot = world.slots.find((item) => item.id === state.hoveredSlotId);
    if (slot) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#ffe9a8";
      ctx.beginPath();
      ctx.ellipse(slot.x, slot.y - 2, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export function drawGoalGlow(
  ctx: CanvasRenderingContext2D,
  world: World,
  tick: number,
): void {
  const theme = themeFor(world.levelId);
  for (const [x, y] of world.level.goals) {
    ctx.save();
    ctx.globalAlpha = 0.18 + Math.sin(tick * 0.06) * 0.08;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.ellipse(x, y, 26, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawSpawnGlow(
  ctx: CanvasRenderingContext2D,
  world: World,
  tick: number,
): void {
  ctx.save();
  ctx.globalAlpha = 0.15 + Math.sin(tick * 0.08) * 0.07;
  ctx.fillStyle = "#c0503a";
  for (const path of world.level.spawns) {
    const [x, y] = path[0];
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawFlagPulse(
  ctx: CanvasRenderingContext2D,
  world: World,
  tick: number,
): void {
  // A small pulsing marker over the first spawn while the first wave waits.
  if (!world.waitingForStart) return;
  const [x, y] = world.level.spawns[0]?.[0] ?? [0, 0];
  ctx.save();
  ctx.globalAlpha = 0.6 + Math.sin(tick * 0.15) * 0.3;
  ctx.fillStyle = "#ffe9a8";
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("CLICK TO START", x, y - 26);
  ctx.restore();
}

export function fontOf(size: number): string {
  return `${size}px ${FONT}`;
}

export type { EnemyDefinition };
