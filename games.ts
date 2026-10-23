export interface Game {
  /** URL-safe id. The game lives in `games/<slug>/index.html`. */
  slug: string;
  title: string;
  description: string;
  tags: string[];
}

// The entries below are placeholders to show the layout — replace them with
// real games as you write them.
export const games: Game[] = [
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
