import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import {
  canPlace,
  createGame,
  type Game,
  moveCueBall,
  objectBallsLeft,
  pickUpCueBall,
  placeCueBall,
  poses,
  shoot,
  tick,
} from "./game.ts";
import { type Ball, createBall } from "./physics/ball.ts";
import type { Shot } from "./physics/cue.ts";
import { headSpot } from "./physics/rack.ts";
import { TABLE } from "./physics/table.ts";
import { FOUL_PENALTY, TIME_LIMIT } from "./rules/timed.ts";

const FRAME = 1 / 60;

/** A game in the aiming phase with just these balls on the table. */
function gameWith(balls: Ball[]): Game {
  const game = createGame(1);
  game.balls = balls;
  game.phase = "aiming";
  game.ballInHand = false;
  return game;
}

/** Plays the shot out frame by frame; returns the seconds it took. */
function play(game: Game, shot: Shot): number {
  shoot(game, shot);
  let elapsed = 0;
  while (game.phase === "rolling") {
    tick(game, FRAME);
    elapsed += FRAME;
  }
  return elapsed;
}

const soft = (x: number, y: number): Shot => ({
  cue: [x, y, 0],
  speed: 2,
  tip: [0, 0],
});

// The top-right corner pocket is up and to the right of these.
const potShot = () => [createBall(0, 0.6, 0), createBall(1, 0.9, 0.3)];

Deno.test("a new game racks 15 balls, with the cue ball in hand for the break", () => {
  const game = createGame(42);
  assertEquals(game.balls.map((b) => b.id).sort((a, b) => a - b), [
    ...Array(16).keys(),
  ]);
  assertEquals(game.balls[0].id, 0);
  assertEquals(game.balls[5].id, 8, "the 8 in the middle of the rack");
  const corners = [game.balls[11].id, game.balls[15].id].sort((a, b) => a - b);
  assert(corners[0] < 8 && corners[1] > 8, "a solid and a stripe at the back");
  assertEquals(game.phase, "placing");
  assertEquals(game.area, "kitchen");
  assertEquals(game.timeLeft, TIME_LIMIT);
});

Deno.test("racks differ by seed and repeat for the same seed", () => {
  const ids = (seed: number) => createGame(seed).balls.map((b) => b.id);
  assertEquals(ids(3), ids(3));
  assert([4, 5, 6].some((seed) => ids(seed).join() !== ids(3).join()));
});

Deno.test("for the break, the cue ball stays behind the head string", () => {
  const game = createGame(1);
  moveCueBall(game, 0.5, 2);
  assertEquals(game.balls[0].x, -TABLE.length / 4);
  assert(game.balls[0].y < TABLE.width / 2);
  assert(placeCueBall(game));
  assertEquals(game.phase, "aiming");
});

Deno.test("the cue ball can't be placed on another ball", () => {
  const game = createGame(1);
  game.area = "table";
  const target = game.balls[3];
  moveCueBall(game, target.x + 0.01, target.y);
  assert(!canPlace(game));
  assert(!placeCueBall(game));
  assertEquals(game.phase, "placing");
});

Deno.test("with ball in hand, the cue ball can be picked up until the shot", () => {
  const game = createGame(1);
  placeCueBall(game);
  pickUpCueBall(game);
  assertEquals(game.phase, "placing");
  placeCueBall(game);
  play(game, soft(1, 0));
  pickUpCueBall(game);
  assert(game.phase !== "placing");
});

Deno.test("a shot plays back in real time while the clock runs", () => {
  const game = gameWith(potShot());
  shoot(game, soft(1, 1));
  assertEquals(game.events[0].type, "strike");
  game.events = [];
  const elapsed = play(game, soft(1, 1));
  assertEquals(game.phase, "won");
  assertEquals(game.shots, 1);
  assertAlmostEquals(game.timeLeft, TIME_LIMIT - elapsed, 1e-9);
});

Deno.test("potting a ball keeps the turn, and the clock running", () => {
  const game = gameWith([...potShot(), createBall(2, -1, -0.4)]);
  play(game, soft(1, 1));
  assertEquals(game.phase, "aiming");
  assertEquals(game.foul, null);
  assertEquals(objectBallsLeft(game), 1);
});

Deno.test("a scratch costs time and gives ball in hand anywhere", () => {
  // The cue ball rolls straight into the corner without touching anything.
  const game = gameWith([createBall(0, 0.9, 0.3), createBall(1, -1, -0.4)]);
  const elapsed = play(game, soft(1, 1));
  assertEquals(game.foul, "scratch");
  assertEquals(game.phase, "placing");
  assertEquals(game.area, "table");
  assert(game.ballInHand);
  assertEquals([game.balls[0].x, game.balls[0].y], headSpot());
  assertEquals(game.balls[0].motion, "stationary");
  assertAlmostEquals(
    game.timeLeft,
    TIME_LIMIT - elapsed - FOUL_PENALTY,
    1e-9,
  );
});

Deno.test("missing every ball is a foul, and the cue ball stays put", () => {
  const game = gameWith([createBall(0, 0, 0), createBall(1, 1, 0.4)]);
  play(game, { cue: [-1, 0, 0], speed: 0.5, tip: [0, 0] });
  assertEquals(game.foul, "miss");
  assertEquals(game.phase, "placing");
  assertEquals(game.fouls, 1);
  assert(game.balls[0].x < 0);
});

Deno.test("running out of time loses", () => {
  const game = createGame(1);
  tick(game, TIME_LIMIT - 1);
  assertEquals(game.phase, "placing");
  tick(game, 2);
  assertEquals(game.phase, "lost");
  assertEquals(game.timeLeft, 0);
  assertEquals(game.events.at(-1)?.type, "lost");
});

Deno.test("a shot rolling at the buzzer finishes, and wins if it clears", () => {
  const winner = gameWith(potShot());
  winner.timeLeft = 0.2;
  play(winner, soft(1, 1));
  assertEquals(winner.phase, "won");
  assertEquals(winner.timeLeft, 0);

  const loser = gameWith([...potShot(), createBall(2, -1, -0.4)]);
  loser.timeLeft = 0.2;
  play(loser, soft(1, 1));
  assertEquals(loser.phase, "lost");
  assertEquals(objectBallsLeft(loser), 1, "the shot still played out");
});

Deno.test("poses follow the shot between recorded frames", () => {
  const game = gameWith(potShot());
  shoot(game, soft(1, 1));
  tick(game, 0.1);
  const [cue] = poses(game);
  assert(cue.x > 0.6 && cue.y > 0, "the cue ball has moved toward the pot");
  assert(cue.x < 0.9);
});
