/**
 * Palette and decorations per stage. The original game ships hand-painted
 * backgrounds; the recreation draws its own art, so each stage gets a palette
 * chosen from its position in the campaign rather than a copy of the original.
 */
export interface Theme {
  /** Vertical gradient of the field. */
  fieldTop: string;
  fieldBottom: string;
  patch: string;
  roadEdge: string;
  road: string;
  roadLine: string;
  stone: string;
  stoneDark: string;
  foliage: string;
  foliageDark: string;
  foliageLight: string;
  trunk: string;
  accent: string;
  flower: string;
  water: string;
}

const THEMES: readonly Theme[] = [
  {
    fieldTop: "#6fae4f",
    fieldBottom: "#4d8c3b",
    patch: "#7fbd58",
    roadEdge: "#8a6a45",
    road: "#c7a06a",
    roadLine: "#b18d5b",
    stone: "#a9a49b",
    stoneDark: "#716d66",
    foliage: "#3f7a34",
    foliageDark: "#2d5a27",
    foliageLight: "#5d9c44",
    trunk: "#6b4a2c",
    accent: "#f2d16b",
    flower: "#f4e06d",
    water: "#5aa7c7",
  },
  {
    fieldTop: "#9bb45c",
    fieldBottom: "#7d9443",
    patch: "#afc46b",
    roadEdge: "#8b6b48",
    road: "#cfae7c",
    roadLine: "#b9975f",
    stone: "#b3aa9a",
    stoneDark: "#7a7164",
    foliage: "#7a7f35",
    foliageDark: "#5b6128",
    foliageLight: "#9aa14a",
    trunk: "#6d4a2b",
    accent: "#e8b558",
    flower: "#e0c25b",
    water: "#5d9fb3",
  },
  {
    fieldTop: "#4f8a5c",
    fieldBottom: "#356344",
    patch: "#5f9c6a",
    roadEdge: "#6f5a3f",
    road: "#a98d62",
    roadLine: "#94784f",
    stone: "#8f938b",
    stoneDark: "#5f625c",
    foliage: "#2f6b3f",
    foliageDark: "#1f4e2d",
    foliageLight: "#438a52",
    trunk: "#5a3f28",
    accent: "#d9c46a",
    flower: "#c5d96e",
    water: "#3f8f96",
  },
  {
    fieldTop: "#a2916d",
    fieldBottom: "#867455",
    patch: "#b3a17b",
    roadEdge: "#7a6547",
    road: "#c0a377",
    roadLine: "#a88c61",
    stone: "#b9b2a5",
    stoneDark: "#807a6e",
    foliage: "#6c7a3f",
    foliageDark: "#4e5a2c",
    foliageLight: "#8a9a55",
    trunk: "#64472c",
    accent: "#e2b45e",
    flower: "#d8c079",
    water: "#5c8f9e",
  },
  {
    fieldTop: "#7a5748",
    fieldBottom: "#543a30",
    patch: "#8b6452",
    roadEdge: "#4c352c",
    road: "#7f6150",
    roadLine: "#6b4f40",
    stone: "#8b817a",
    stoneDark: "#59514c",
    foliage: "#5c4b33",
    foliageDark: "#3f3222",
    foliageLight: "#7a6242",
    trunk: "#3f2a1d",
    accent: "#e0743f",
    flower: "#d9693a",
    water: "#c2543a",
  },
  {
    fieldTop: "#b8c6cb",
    fieldBottom: "#8fa4ad",
    patch: "#cdd8dc",
    roadEdge: "#7f8b92",
    road: "#b6c1c6",
    roadLine: "#a2aeb4",
    stone: "#c3cbd0",
    stoneDark: "#8a949a",
    foliage: "#5f7a72",
    foliageDark: "#435c56",
    foliageLight: "#7e998f",
    trunk: "#5a4a3c",
    accent: "#8fd3e8",
    flower: "#e8f1f4",
    water: "#7cc0d6",
  },
];

export function themeFor(levelId: number): Theme {
  const index = Math.min(THEMES.length - 1, Math.floor((levelId - 1) / 3));
  return THEMES[index];
}
