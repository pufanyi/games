// Campaign progress: which level/mode pairs were beaten, plus the chosen
// difficulty. Kept in localStorage as a per-viewer convenience, so a blocked or
// full store simply starts a fresh campaign.
import { LEVELS } from "../content/levels.ts";
import type { Difficulty, GameMode } from "../game/types.ts";

export interface Progress {
  /** `"<levelId>:<mode>"` keys that have been cleared. */
  won: Record<string, true>;
  difficulty: Difficulty;
}

const STORAGE_KEY = "kingdom-rush.progress.v1";

function key(levelId: number, mode: GameMode): string {
  return `${levelId}:${mode}`;
}

export function emptyProgress(): Progress {
  return { won: {}, difficulty: "normal" };
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "normal" || value === "hard";
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return emptyProgress();
    const record = parsed as { won?: unknown; difficulty?: unknown };
    const won: Record<string, true> = {};
    if (typeof record.won === "object" && record.won !== null) {
      for (const entry of Object.keys(record.won)) {
        if ((record.won as Record<string, unknown>)[entry] === true) {
          won[entry] = true;
        }
      }
    }
    return {
      won,
      difficulty: isDifficulty(record.difficulty)
        ? record.difficulty
        : "normal",
    };
  } catch {
    return emptyProgress();
  }
}

function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Progress is a convenience; a full or blocked store is not an error.
  }
}

export function setDifficulty(
  progress: Progress,
  difficulty: Difficulty,
): void {
  progress.difficulty = difficulty;
  saveProgress(progress);
}

export function cleared(
  progress: Progress,
  levelId: number,
  mode: GameMode,
): boolean {
  return progress.won[key(levelId, mode)] === true;
}

/**
 * Campaign stages unlock one after another; heroic needs the campaign cleared,
 * iron needs heroic, as in the original.
 */
export function unlocked(
  progress: Progress,
  levelId: number,
  mode: GameMode,
): boolean {
  if (mode === "campaign") {
    return levelId === 1 || cleared(progress, levelId - 1, "campaign");
  }
  if (mode === "heroic") return cleared(progress, levelId, "campaign");
  return cleared(progress, levelId, "heroic");
}

export function recordWin(
  progress: Progress,
  levelId: number,
  mode: GameMode,
): void {
  progress.won[key(levelId, mode)] = true;
  saveProgress(progress);
}

export function nextLevelId(levelId: number): number | null {
  return levelId < LEVELS.length ? levelId + 1 : null;
}
