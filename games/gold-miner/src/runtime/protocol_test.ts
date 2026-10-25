import { assert, assertEquals } from "@std/assert";
import { createGame } from "../game/sim.ts";
import { interpolate, isCommand, isSnapshot } from "./protocol.ts";

Deno.test("network validates snapshots before the canvas reads them", () => {
  const valid = {
    game: createGame(42, 2),
    lobby: true,
    ready: [false, false],
    paused: false,
    round: 0,
  };
  assert(isSnapshot(JSON.parse(JSON.stringify(valid))));
  assert(!isSnapshot({ ...valid, game: { ...valid.game, players: [] } }));
  assert(
    !isSnapshot({
      ...valid,
      game: { ...valid.game, items: [{ kind: "constructor" }] },
    }),
  );
  assert(!isSnapshot({ ...valid, game: { ...valid.game, money: NaN } }));
  assert(!isSnapshot({ ...valid, game: { ...valid.game, effects: [{}] } }));
  assert(!isSnapshot({ ...valid, ready: [] }));
});

Deno.test("network command validation rejects invented actions and shop items", () => {
  assert(
    isCommand({
      kind: "input",
      level: 1,
      phase: "playing",
      input: { player: 1, action: "fire" },
    }),
  );
  assert(
    !isCommand({
      kind: "input",
      level: 1,
      phase: "shop",
      input: { player: 1, action: "buy", item: "constructor" },
    }),
  );
  assert(
    !isCommand({
      kind: "input",
      level: 1,
      phase: "playing",
      input: { player: 2, action: "fire" },
    }),
  );
  assert(!isCommand({ kind: "pause", paused: "yes" }));
});

Deno.test("interpolation smooths continuous motion without changing authoritative state", () => {
  const old = createGame(1, 2);
  const next = structuredClone(old);
  next.players[1].claw.angle = 1;
  const rendered = interpolate(old, next, 0.5);
  assertEquals(rendered.players[1].claw.angle, 0.5);
  assertEquals(next.players[1].claw.angle, 1);
  next.players[1].claw.state = "retract";
  assertEquals(interpolate(old, next, 0.5).players[1].claw.angle, 1);
  next.level++;
  assertEquals(interpolate(old, next, 0.5), next);
});
