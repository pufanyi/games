// Progress and preferences in localStorage; blocked storage falls back to
// defaults. The original kept the unlocked stage in a Flash SharedObject.

const UNLOCKED_KEY = "nail-house:unlocked";
const MUTED_KEY = "nail-house:muted";

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A blocked store just means progress is not remembered.
  }
}

export function loadUnlocked(): number {
  const value = read(UNLOCKED_KEY);
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.min(7, Math.floor(value)))
    : 1;
}

export function saveUnlocked(level: number): void {
  write(UNLOCKED_KEY, level);
}

export function loadMuted(): boolean {
  return read(MUTED_KEY) === true;
}

export function saveMuted(muted: boolean): void {
  write(MUTED_KEY, muted);
}
