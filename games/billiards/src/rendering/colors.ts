export const BALL_COLORS = [
  "#f5f1e5",
  "#eebc19",
  "#1753b5",
  "#cd222e",
  "#683293",
  "#ea6b19",
  "#137849",
  "#7d2029",
  "#17191c",
];
export function ballColor(id: number): string {
  return BALL_COLORS[id > 8 ? id - 8 : id];
}
