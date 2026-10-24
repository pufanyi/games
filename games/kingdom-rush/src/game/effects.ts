import type { EnemyDefinition } from "../content/types.ts";
import type { EffectKind, World } from "./types.ts";

/** Add a short-lived visual effect; the renderer picks these up. */
export function addEffect(
  world: World,
  kind: EffectKind,
  x: number,
  y: number,
  options: { life?: number; radius?: number; angle?: number } = {},
): void {
  world.effects.push({
    id: world.nextId++,
    kind,
    x,
    y,
    age: 0,
    life: options.life ?? 20,
    radius: options.radius ?? 12,
    angle: options.angle ?? 0,
  });
  if (world.effects.length > 200) {
    world.effects.splice(0, world.effects.length - 200);
  }
}

export function updateEffects(world: World): void {
  for (const effect of world.effects) effect.age++;
  world.effects = world.effects.filter((effect) => effect.age < effect.life);
}

/**
 * The original's `getArmorDamage`: physical damage is reduced by armour,
 * magic by magic armour, elemental by half the armour, and "ignore" by
 * nothing. Damage is not rounded.
 */
export function reduceDamage(
  definition: EnemyDefinition,
  type: "physical" | "magic" | "elemental" | "ignore",
  amount: number,
  armorReduction = 0,
): number {
  let armor = definition.armor;
  if (armorReduction > 0) armor = Math.max(0, armor - armorReduction);
  switch (type) {
    case "physical":
      return amount - (armor * amount) / 100;
    case "magic":
      return amount - (definition.magicArmor * amount) / 100;
    case "elemental":
      return amount - ((armor / 2) * amount) / 100;
    default:
      return amount;
  }
}
