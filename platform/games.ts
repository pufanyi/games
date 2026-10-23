export interface Game {
  /**
   * URL-safe id. The game's source is `games/<slug>/`, its published build is
   * served at `/games/<slug>/`, and the platform page that embeds it is
   * `/play/<slug>`.
   */
  slug: string;
  title: string;
  description: string;
  tags: string[];
  /** Width and height the player keeps when scaling the game window. */
  aspectRatio: [number, number];
}

export const games: Game[] = [
  {
    slug: "gold-miner",
    title: "Gold Miner",
    description:
      "Swing the claw and haul up gold and diamonds before time runs out.",
    tags: ["arcade", "classic"],
    aspectRatio: [4, 3],
  },
  {
    slug: "billiards",
    title: "Billiards",
    description:
      "Clear the table against the clock, or play 8-ball with a friend online.",
    tags: ["sports", "multiplayer", "classic"],
    aspectRatio: [16, 9],
  },
  // The sample-* entries are placeholders to show the layout — remove them as
  // real games are written.
  {
    slug: "sample-platformer",
    title: "Sample Platformer",
    description: "Run, jump, and collect coins across side-scrolling levels.",
    tags: ["action", "platformer"],
    aspectRatio: [16, 9],
  },
  {
    slug: "sample-puzzle",
    title: "Sample Puzzle",
    description: "Match tiles before the board fills up.",
    tags: ["puzzle"],
    aspectRatio: [1, 1],
  },
  {
    slug: "sample-shooter",
    title: "Sample Shooter",
    description: "Defend the base from waves of incoming invaders.",
    tags: ["action", "arcade"],
    aspectRatio: [3, 4],
  },
];

export function findGame(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug);
}
