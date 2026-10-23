export interface Game {
  /** URL-safe id. The game lives in `games/<slug>/index.html`. */
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
  // The sample-* entries are placeholders to show the layout — remove them as
  // real games are written.
  {
    slug: "sample-platformer",
    title: "Sample Platformer",
    description: "Run, jump, and collect coins across side-scrolling levels.",
    tags: ["action", "platformer"],
  },
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
