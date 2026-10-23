import type { Direction, Input } from "../game/types.ts";
export type Action = Direction | "action";
export class Controls {
  private keys: string[] = [];
  private pointers = new Map<number, Action>();
  constructor(readonly players: 1 | 2) {}
  key(code: string, down: boolean) {
    this.keys = this.keys.filter((k) => k !== code);
    if (down) this.keys.push(code);
  }
  pointer(id: number, action: Action | null) {
    if (action) this.pointers.set(id, action);
    else this.pointers.delete(id);
  }
  clear() {
    this.keys = [];
    this.pointers.clear();
  }
  read(): Input[] {
    const first: Record<string, Action> = {
      KeyW: "up",
      KeyS: "down",
      KeyA: "left",
      KeyD: "right",
      Space: "action",
    };
    const second: Record<string, Action> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      Enter: "action",
    };
    if (this.players === 1) Object.assign(first, second);
    const read = (map: Record<string, Action>, touch: boolean): Input => {
      const actions = [
        ...this.keys.map((key) => map[key]),
        ...(touch ? [...this.pointers.values()] : []),
      ].filter((a) => a !== undefined);
      const direction = actions.filter((a) => a !== "action").at(-1) ?? null;
      return { direction, action: actions.includes("action") };
    };
    return [read(first, true), read(second, false)];
  }
}
export const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Enter",
]);
