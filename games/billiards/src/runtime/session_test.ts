import { assertAlmostEquals, assertEquals } from "@std/assert";
import {
  aimAt,
  beginCharge,
  cancelCharge,
  CHARGE_SECONDS,
  createSession,
  pickUp,
  place,
  releaseCharge,
  setPaused,
  setPower,
  setTip,
  shootNow,
  toggleGuide,
  turnAim,
  update,
  viewOf,
} from "./session.ts";

function aiming() {
  const session = createSession();
  session.mode = "game";
  place(session);
  assertEquals(session.game.phase, "aiming");
  return session;
}

Deno.test("charge starts at zero, holds at maximum, and only fires on matching release", () => {
  const session = aiming();
  beginCharge(session, "keyboard");
  update(session, CHARGE_SECONDS / 2);
  assertAlmostEquals(session.power, 0.5);
  assertEquals(viewOf(session).charging, true);
  update(session, CHARGE_SECONDS * 2);
  assertEquals(session.power, 1);
  assertEquals(session.game.shots, 0);
  releaseCharge(session, "pointer");
  assertEquals(session.game.shots, 0);
  releaseCharge(session, "keyboard");
  assertEquals(session.game.shots, 1);
  assertEquals(session.pulling, false);
  releaseCharge(session, "keyboard");
  assertEquals(session.game.shots, 1);
});

Deno.test("charging freezes the shot setup and rejects competing inputs", () => {
  const session = aiming();
  beginCharge(session, "pointer");
  update(session, 0.3);
  beginCharge(session, "keyboard");
  setPower(session, 1);
  aimAt(session, 0, 1);
  turnAim(session, 1);
  setTip(session, 0.3, 0.3);
  pickUp(session);
  shootNow(session);
  assertEquals(session.charge, "pointer");
  assertAlmostEquals(session.power, 0.2);
  assertEquals(session.aim, 0);
  assertEquals(session.tip, [0, 0]);
  assertEquals(session.game.phase, "aiming");
  assertEquals(session.game.shots, 0);
});

Deno.test("cancel and pause disarm release, including after resume", () => {
  for (const pause of [false, true]) {
    const session = aiming();
    beginCharge(session, "keyboard");
    update(session, 0.3);
    if (pause) setPaused(session, true);
    else cancelCharge(session);
    setPaused(session, false);
    releaseCharge(session, "keyboard");
    assertEquals(session.game.shots, 0);
    assertEquals(session.pulling, false);
    assertEquals(viewOf(session).charging, false);
  }
});

Deno.test("placement, timeout and immediate release cannot fire a charged shot", () => {
  const session = aiming();
  pickUp(session);
  beginCharge(session, "keyboard");
  assertEquals(session.charge, null);
  place(session);
  beginCharge(session, "keyboard");
  releaseCharge(session, "keyboard");
  assertEquals(session.game.shots, 0);
  beginCharge(session, "keyboard");
  session.game.timeLeft = 0.1;
  update(session, 0.2);
  releaseCharge(session, "keyboard");
  assertEquals(session.game.phase, "lost");
  assertEquals(session.game.shots, 0);
  assertEquals(session.charge, null);
});

Deno.test("preset strength keeps the nonlinear cue-speed mapping", () => {
  const session = aiming();
  setPower(session, 0.5);
  shootNow(session);
  const strike = session.game.events.find((event) => event.type === "strike");
  assertEquals(strike, { type: "strike", speed: 2.25 });
});

Deno.test("charge strength depends on elapsed time, not frame count", () => {
  const a = aiming();
  const b = aiming();
  beginCharge(a, "pointer");
  beginCharge(b, "pointer");
  update(a, 0.6);
  for (let frame = 0; frame < 60; frame++) update(b, 0.01);
  assertAlmostEquals(a.power, b.power);
});

Deno.test("cancelling a charge restores the strength set before it", () => {
  const session = aiming();
  setPower(session, 0.65);
  beginCharge(session, "table");
  update(session, 0.1);
  cancelCharge(session);
  assertAlmostEquals(session.power, 0.65);
  assertEquals(session.game.shots, 0);
});

Deno.test("the aim guide starts off and toggles", () => {
  const session = createSession();
  assertEquals(viewOf(session).guide, false);
  toggleGuide(session);
  assertEquals(viewOf(session).guide, true);
});
