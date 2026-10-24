// Per-viewer conveniences in localStorage; failures (private mode, blocked
// storage) fall back to defaults.

export interface Best {
  /** Seconds left on the clock when the table was cleared. */
  timeLeft: number;
  shots: number;
}

const BEST_KEY = "billiards:best";
const MUTED_KEY = "billiards:muted";
const GUIDE_KEY = "billiards:guide";

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
  const { timeLeft, shots } = value ?? {};
  return typeof timeLeft === "number" && typeof shots === "number"
    ? { timeLeft, shots }
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

/** The aim guide is off unless the player turned it on. */
export function loadGuide(): boolean {
  return load(GUIDE_KEY) === true;
}

export function saveGuide(guide: boolean) {
  save(GUIDE_KEY, guide);
}
