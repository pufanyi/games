// Per-viewer conveniences in localStorage; failures (private mode, blocked
// storage) fall back to defaults.

export interface Best {
  level: number;
  money: number;
}

const BEST_KEY = "gold-miner:best";
const MUTED_KEY = "gold-miner:muted";

function load(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do; the game works without storage.
  }
}

export function loadBest(): Best | null {
  const value = load(BEST_KEY) as Partial<Best> | null;
  const { level, money } = value ?? {};
  return typeof level === "number" && typeof money === "number"
    ? { level, money }
    : null;
}

export function saveBest(best: Best) {
  save(BEST_KEY, best);
}

export function loadMuted(): boolean {
  return load(MUTED_KEY) === true;
}

export function saveMuted(muted: boolean) {
  save(MUTED_KEY, muted);
}
