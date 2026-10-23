export interface Game {
  /**
   * URL-safe id. The game's source is `games/<slug>/`, its published build is
   * served directly at `/games/<slug>/`. Legacy `/play/<slug>` links redirect
   * there once the build is published.
   */
  slug: string;
  title: string;
  description: string;
  tags: string[];
}

export const games: Game[] = [
  {
    slug: "gold-miner",
    title: "Gold Miner",
    description:
      "Swing the claw and haul up gold and diamonds before time runs out.",
    tags: ["arcade", "classic"],
  },
  {
    slug: "billiards",
    title: "Billiards",
    description:
      "Clear all 15 balls against the clock, on a table with real pool physics.",
    tags: ["sports", "classic"],
  },
  {
    slug: "bomb-it-3",
    title: "Bomb It 3",
    description:
      "Little robots, big adventures. Bomb, battle, splash, and race through four colorful worlds.",
    tags: ["arcade", "two-player", "classic"],
  },
  // The sample-* entries are placeholders to show the layout — remove them as
  // real games are written.
  {
    slug: "sample-puzzle",
    title: "Sample Puzzle",
    description: "Match tiles before the board fills up.",
    tags: ["puzzle"],
  },
  {
    slug: "sample-shooter",
    title: "Sample Shooter",
    description: "Defend the base from waves of incoming invaders.",
    tags: ["action", "arcade"],
  },
];

export function findGame(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug);
}
