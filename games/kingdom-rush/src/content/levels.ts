// All 17 campaign stages. Stage titles come from the original game's
// locale files, which are not part of the SWF; the recreation numbers
// them instead of inventing names.
import type { LevelDefinition } from "./types.ts";
import { LEVEL_01 } from "./levels/level_01.ts";
import { LEVEL_02 } from "./levels/level_02.ts";
import { LEVEL_03 } from "./levels/level_03.ts";
import { LEVEL_04 } from "./levels/level_04.ts";
import { LEVEL_05 } from "./levels/level_05.ts";
import { LEVEL_06 } from "./levels/level_06.ts";
import { LEVEL_07 } from "./levels/level_07.ts";
import { LEVEL_08 } from "./levels/level_08.ts";
import { LEVEL_09 } from "./levels/level_09.ts";
import { LEVEL_10 } from "./levels/level_10.ts";
import { LEVEL_11 } from "./levels/level_11.ts";
import { LEVEL_12 } from "./levels/level_12.ts";
import { LEVEL_13 } from "./levels/level_13.ts";
import { LEVEL_14 } from "./levels/level_14.ts";
import { LEVEL_15 } from "./levels/level_15.ts";
import { LEVEL_16 } from "./levels/level_16.ts";
import { LEVEL_17 } from "./levels/level_17.ts";

export const LEVELS: readonly LevelDefinition[] = [
  LEVEL_01,
  LEVEL_02,
  LEVEL_03,
  LEVEL_04,
  LEVEL_05,
  LEVEL_06,
  LEVEL_07,
  LEVEL_08,
  LEVEL_09,
  LEVEL_10,
  LEVEL_11,
  LEVEL_12,
  LEVEL_13,
  LEVEL_14,
  LEVEL_15,
  LEVEL_16,
  LEVEL_17,
];

export function levelById(id: number): LevelDefinition | undefined {
  return LEVELS.find((level) => level.id === id);
}
