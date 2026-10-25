import { KINDS } from "../game/items.ts";
import { SHOP_ITEMS } from "../game/shop.ts";
import type { GameState, Input } from "../game/sim.ts";

export type Command =
  | { kind: "input"; input: Input; level: number; phase: GameState["phase"] }
  | { kind: "start" }
  | { kind: "visibility"; hidden: boolean }
  | { kind: "pause"; paused: boolean };
export interface Snapshot {
  game: GameState;
  lobby: boolean;
  paused: boolean;
  round: number;
}
/**
 * The room relay's display-name rule (multiplayer/rooms.ts), repeated so the
 * game can tidy a name before sending it instead of being disconnected.
 */
export function playerName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.replace(/\s+/g, " ").trim();
  const length = [...name].length;
  return length >= 1 && length <= 20 &&
      !/[\p{Cc}\p{Cs}\p{Co}\p{Cn}]|(?!\u200d)\p{Cf}/u.test(name)
    ? name
    : null;
}
export function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const numbers = (value: Record<string, unknown>, keys: string[]) =>
  keys.every((key) => finite(value[key]));
const has = (record: object, key: unknown) =>
  typeof key === "string" && Object.hasOwn(record, key);
function item(value: unknown): boolean {
  return object(value) && has(KINDS, value.kind) &&
    numbers(value, ["id", "x", "y", "r"]) &&
    ["vx", "weight", "minX", "maxX"].every((key) =>
      value[key] === undefined || finite(value[key])
    ) &&
    (value.carrying === undefined || typeof value.carrying === "boolean");
}
const events = new Set([
  "fire",
  "grab",
  "grabHeavy",
  "reel",
  "cash",
  "cashBig",
  "explode",
  "bonus",
  "buy",
  "levelClear",
  "gameOver",
]);
export function isSnapshot(value: unknown): value is Snapshot {
  if (
    !object(value) || typeof value.lobby !== "boolean" ||
    typeof value.paused !== "boolean" || !finite(value.round)
  ) return false;
  const g = value.game;
  if (
    !object(g) ||
    !numbers(g, [
      "seed",
      "rng",
      "nextId",
      "tick",
      "level",
      "money",
      "goal",
      "timeLeft",
      "dynamite",
    ]) || !["playing", "shop", "gameOver"].includes(String(g.phase))
  ) return false;
  if (
    !object(g.boosts) ||
    !["strength", "clover", "book", "polish"].every((key) =>
      object(g.boosts) && typeof g.boosts[key] === "boolean"
    )
  ) return false;
  if (
    !Array.isArray(g.ready) || g.ready.length !== 2 ||
    !g.ready.every((v) => typeof v === "boolean")
  ) return false;
  if (!Array.isArray(g.items) || g.items.length > 200 || !g.items.every(item)) {
    return false;
  }
  if (
    !Array.isArray(g.players) || g.players.length !== 2 ||
    !g.players.every((p) => {
      if (!object(p) || !finite(p.x) || !object(p.claw)) return false;
      const c = p.claw;
      return ["swing", "extend", "retract"].includes(String(c.state)) &&
        numbers(c, ["angle", "dir", "length"]) &&
        (c.item === null || item(c.item));
    })
  ) return false;
  if (
    !Array.isArray(g.effects) || g.effects.length > 200 ||
    !g.effects.every((e) =>
      object(e) && numbers(e, ["x", "y", "ttl", "maxTtl"]) &&
      ((e.type === "popup" && typeof e.text === "string") ||
        (e.type === "explosion" && finite(e.radius)))
    )
  ) return false;
  if (
    !Array.isArray(g.events) || g.events.length > 200 ||
    !g.events.every((e) => object(e) && events.has(String(e.type)))
  ) return false;
  return g.shop === null ||
    (object(g.shop) && Array.isArray(g.shop.offers) &&
      g.shop.offers.length <= 5 &&
      g.shop.offers.every((o) =>
        object(o) && has(SHOP_ITEMS, o.item) && finite(o.price) &&
        typeof o.sold === "boolean"
      ));
}
export function isCommand(value: unknown): value is Command {
  if (!object(value)) return false;
  if (value.kind === "start") return true;
  if (value.kind === "visibility") return typeof value.hidden === "boolean";
  if (value.kind === "pause") return typeof value.paused === "boolean";
  if (
    value.kind !== "input" || !finite(value.level) ||
    !["playing", "shop", "gameOver"].includes(String(value.phase))
  ) return false;
  const input = value.input;
  return object(input) && (input.player === 0 || input.player === 1) &&
    (["fire", "dynamite", "continue"].includes(String(input.action)) ||
      (input.action === "buy" && has(SHOP_ITEMS, input.item)));
}

/** Smooth only continuous motion, never interpolate a catch or a new level. */
export function interpolate(
  previous: GameState,
  next: GameState,
  fraction: number,
): GameState {
  if (previous.level !== next.level || previous.phase !== next.phase) {
    return next;
  }
  const t = Math.max(0, Math.min(1, fraction));
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const result = structuredClone(next);
  result.tick = lerp(previous.tick, next.tick);
  for (let i = 0; i < result.players.length; i++) {
    const old = previous.players[i]?.claw;
    const claw = result.players[i].claw;
    if (!old || old.state !== claw.state || old.item?.id !== claw.item?.id) {
      continue;
    }
    claw.angle = lerp(old.angle, claw.angle);
    claw.length = lerp(old.length, claw.length);
    if (old.item && claw.item) {
      claw.item.x = lerp(old.item.x, claw.item.x);
      claw.item.y = lerp(old.item.y, claw.item.y);
    }
  }
  for (const item of result.items) {
    const old = previous.items.find((candidate) => candidate.id === item.id);
    if (old) {
      item.x = lerp(old.x, item.x);
      item.y = lerp(old.y, item.y);
    }
  }
  return result;
}
