import { assert, assertAlmostEquals } from "@std/assert";
import { Vector3 } from "three";
import { BALL_RADIUS as R } from "../physics/constants.ts";
import { TABLE } from "../physics/table.ts";
import {
  createSession,
  place,
  setPower,
  shootNow,
  turnAim,
  update,
} from "../runtime/session.ts";
import { eye, TableCamera } from "./camera.ts";

function aiming(aim = 0) {
  const session = createSession();
  // As in a started game, without unlocking browser audio.
  session.mode = "game";
  place(session);
  turnAim(session, aim);
  return session;
}

Deno.test("every view maps ball centers back to table meters", () => {
  const cameras = new TableCamera();
  const session = aiming(0.4);
  for (const view of ["top", "cue"] as const) {
    cameras.view = view;
    cameras.update(session, Infinity);
    const cue = session.game.balls[0];
    for (
      const [x, y] of [
        [cue.x + 0.3, cue.y + 0.1],
        [cue.x + 0.9, cue.y + 0.5],
        [0.8, 0.2],
      ]
    ) {
      const screen = new Vector3(x, y, R).project(cameras.active);
      const point = cameras.toTable(screen.x, screen.y);
      assert(point);
      assertAlmostEquals(point[0], x, 1e-9);
      assertAlmostEquals(point[1], y, 1e-9);
    }
  }
});

Deno.test("the cue view sits behind the cue ball, looking along the aim", () => {
  const cameras = new TableCamera();
  for (const aim of [0, 1, 2.5, -2]) {
    const session = aiming(aim);
    cameras.update(session, Infinity);
    const cue = session.game.balls[0];
    const [x, y, z] = eye(cameras.behindCue(session));
    // Behind: the eye is on the far side of the cue ball from the aim.
    const along = (x - cue.x) * Math.cos(session.aim) +
      (y - cue.y) * Math.sin(session.aim);
    assert(along < -0.5, `aim ${aim}: eye ${along} m along the aim`);
    assert(z > 0.15 && z < 0.6, `aim ${aim}: eye ${z} m up`);
    // The cue ball shows low and centered, with the table ahead above it.
    const ball = new Vector3(cue.x, cue.y, R).project(cameras.active);
    assertAlmostEquals(ball.x, 0, 1e-9);
    assert(ball.y < -0.2 && ball.y > -0.9, `aim ${aim}: ball at ${ball.y}`);
  }
});

Deno.test("the overview fits the whole table clear of the HUD", () => {
  const cameras = new TableCamera();
  const session = aiming(0);
  session.mode = "title";
  cameras.update(session, Infinity);
  const l = TABLE.length / 2 + 0.17;
  const w = TABLE.width / 2 + 0.17;
  for (const [x, y] of [[-l, -w], [l, -w], [l, w], [-l, w]]) {
    const corner = new Vector3(x, y, 0.05).project(cameras.active);
    assert(Math.abs(corner.x) < 0.86 && Math.abs(corner.y) < 0.75);
  }
});

Deno.test("the camera eases toward a new aim instead of jumping", () => {
  const cameras = new TableCamera();
  const session = aiming(0);
  cameras.update(session, Infinity);
  const before = cameras.active.position.clone();
  turnAim(session, Math.PI / 2);
  cameras.update(session, 1 / 60);
  const moved = cameras.active.position.distanceTo(before);
  cameras.update(session, Infinity);
  const total = cameras.active.position.distanceTo(before);
  assert(moved > 0 && moved < total / 2);
});

Deno.test("after the strike the camera rises to show the table", () => {
  const cameras = new TableCamera();
  const session = aiming(0);
  cameras.update(session, Infinity);
  const low = cameras.active.position.z;
  setPower(session, 0.3);
  shootNow(session);
  for (let i = 0; i < 90; i++) {
    update(session, 1 / 60);
    cameras.update(session, 1 / 60);
  }
  assert(session.game.phase === "rolling");
  assert(cameras.active.position.z > low + 1);
});
