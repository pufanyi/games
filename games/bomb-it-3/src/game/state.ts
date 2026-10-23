import layouts from "../content/layouts.json" with { type: "json" };
import { BASE_WEAPON, itemPool, RIDES, THEMES } from "../content/catalog.ts";
import { BOX, COLS, index, PIT, random, WALL } from "./types.ts";
import type { Direction, Player, Settings, State } from "./types.ts";
export const DEFAULT_SETTINGS: Settings = {
  mode: "arcade",
  theme: "farm",
  players: 1,
  enemies: 3,
  difficulty: "normal",
  levels: 3,
  characters: [0, 1],
};
export function createGame(settings: Settings, seed: number, level = 1): State {
  const rng = { seed: seed >>> 0 };
  const theme = settings.theme === "random"
    ? THEMES[Math.floor(random(rng) * 4)].id
    : settings.theme;
  const mode = settings.mode === "race"
    ? "race"
    : settings.mode === "water"
    ? "water"
    : "normal";
  const choices = layouts.filter((l) => l.theme === theme && l.mode === mode);
  const layout = choices[Math.floor(random(rng) * choices.length)];
  const pool = itemPool(settings.mode, theme);
  const tiles = layout.rows.flatMap((row) =>
    Array.from(
      row,
      (c) =>
        c === "#"
          ? WALL
          : c === "~"
          ? PIT
          : c === "?" && random(rng) < 0.6
          ? BOX
          : 0,
    )
  );
  const hidden = tiles.map((t) =>
    t === BOX && random(rng) < 0.72
      ? pool[Math.floor(random(rng) * pool.length)]
      : null
  );
  const positions = [{ x: 1, y: 1 }, { x: 15, y: 13 }, { x: 15, y: 1 }, {
    x: 1,
    y: 13,
  }];
  const count = Math.min(4, settings.players + Math.max(0, settings.enemies));
  const used = settings.characters.slice(0, settings.players);
  const colors = [...used, ...[0, 1, 2, 3].filter((c) => !used.includes(c))];
  const players: Player[] = Array.from({ length: count }, (_, id) => {
    const spawn = settings.mode === "race"
      ? { x: colors[id] < 2 ? 1 : 2, y: 1 }
      : positions[id];
    return {
      id,
      character: colors[id],
      human: id < settings.players,
      ...spawn,
      spawn: { ...spawn },
      direction: "down",
      alive: true,
      respawn: 0,
      invincible: 45,
      shield: false,
      ride: settings.mode === "race" ? RIDES[theme] : null,
      power: 1,
      capacity: 1,
      speed: 1.5,
      kick: false,
      weapon: BASE_WEAPON[settings.mode],
      ammo: -1,
      cooldown: 0,
      moving: false,
      kills: 0,
      checkpoints: 0,
      score: 0,
      lives: id < settings.players ? 3 : 1,
      aiDirection: null,
      aiNext: 0,
      aiAction: false,
      stuck: 0,
      lastX: spawn.x,
      lastY: spawn.y,
      featureCooldown: 0,
      stun: 0,
    };
  });
  for (const p of players) {
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.x + dx, y = p.y + dy;
      if (x > 0 && x < 16 && y > 0 && y < 14 && tiles[index(x, y)] !== WALL) {
        tiles[index(x, y)] = 0;
        hidden[index(x, y)] = null;
      }
    }
  }
  const features = layout.features.map((f) => {
    const d = f.args.find((a) => a.startsWith("Direction."))?.split(".")[1]
      .toLowerCase();
    const direction: Direction = d === "up" || d === "down" || d === "left"
      ? d
      : "right";
    return {
      x: f.x,
      y: f.y,
      origin: { x: f.x, y: f.y },
      kind: f.kind,
      direction,
      phase: 0,
    };
  });
  const rails = features.filter((f) => f.kind === "Rail");
  if (rails.length) {
    features.push({
      ...rails[0],
      kind: "Tram",
      origin: { ...rails[0].origin },
    });
  }
  return {
    settings: structuredClone(settings),
    seed: rng.seed,
    tick: 0,
    time: 180 * 30,
    level,
    theme,
    layout: layout.id,
    tiles,
    hidden,
    players,
    bombs: [],
    fire: [],
    pickups: [],
    projectiles: [],
    features,
    routes: layout.checkpoints.map((route) =>
      route.map(([x, y]) => ({ x, y }))
    ),
    status: "playing",
    events: [],
    nextId: 1,
  };
}
export function nextRound(previous: State): State {
  const s = createGame(
    previous.settings,
    previous.seed,
    previous.level + (previous.status === "won" ? 1 : 0),
  );
  s.players.forEach((p, i) => {
    if (p.human) {
      p.lives = previous.players[i].lives;
      p.alive = p.lives > 0;
      p.score = previous.players[i].score;
    }
  });
  return s;
}
export function finishRound(s: State, won: boolean) {
  if (s.status !== "playing") return;
  s.status = won ? "won" : "lost";
  for (const p of s.players.filter((p) => p.human)) {
    if (won) {
      p.score +=
        ({ easy: 1000, normal: 2000, hard: 3000 }[s.settings.difficulty]) +
        Math.ceil(s.time / 30) * 10;
    } else p.lives = Math.max(0, p.lives - 1);
  }
}
export function emptyCell(s: State): { x: number; y: number } | null {
  const free = s.tiles.flatMap((t, i) => t === 0 ? [i] : []).filter((i) =>
    !s.bombs.some((b) => index(b.x, b.y) === i) &&
    !s.pickups.some((p) => index(p.x, p.y) === i)
  );
  if (!free.length) return null;
  const i = free[Math.floor(random(s) * free.length)];
  return { x: i % COLS, y: Math.floor(i / COLS) };
}
