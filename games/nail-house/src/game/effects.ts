import type { FloaterState, GameState, RingState } from "./types.ts";

export function ageEffects(state: GameState): void {
  for (let i = state.floaters.length - 1; i >= 0; i--) {
    const floater = state.floaters[i];
    floater.y -= 0.55;
    floater.life--;
    if (floater.life <= 0) state.floaters.splice(i, 1);
  }
  for (let i = state.rings.length - 1; i >= 0; i--) {
    const ring = state.rings[i];
    ring.life--;
    if (ring.life <= 0) state.rings.splice(i, 1);
  }
}

export function addFloater(
  state: GameState,
  x: number,
  y: number,
  text: string,
  color: string,
  size: number,
): void {
  const floater: FloaterState = {
    id: state.nextId++,
    x,
    y,
    text,
    color,
    life: 42,
    maxLife: 42,
    size,
  };
  state.floaters.push(floater);
}

export function addRing(
  state: GameState,
  x: number,
  y: number,
  radius: number,
  color: string,
  width: number,
): void {
  const ring: RingState = {
    id: state.nextId++,
    x,
    y,
    radius: 2,
    maxRadius: radius,
    life: 18,
    maxLife: 18,
    color,
    width,
  };
  state.rings.push(ring);
}
