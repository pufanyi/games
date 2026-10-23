import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { clock, Hud, ResultScreen } from "./screens.tsx";
import type { View } from "../runtime/session.ts";

const noop = () => {};

function view(overrides: Partial<View> = {}): View {
  return {
    mode: "game",
    paused: false,
    muted: false,
    phase: "aiming",
    area: "table",
    ballInHand: false,
    seconds: 83,
    ballsLeft: 4,
    potted: [],
    shots: 12,
    fouls: 1,
    foul: null,
    power: 0.5,
    charging: false,
    tip: [0, 0],
    elevation: 0,
    best: null,
    newBest: false,
    ...overrides,
  };
}

Deno.test("the clock reads minutes and seconds", () => {
  assertEquals(clock(180), "3:00");
  assertEquals(clock(83), "1:23");
  assertEquals(clock(9.2), "0:10");
  assertEquals(clock(-3), "0:00");
});

Deno.test("clearing the table shows the time left and a new best", () => {
  const html = renderToStaticMarkup(
    <ResultScreen
      view={view({ phase: "won", ballsLeft: 0, newBest: true })}
      onPlayAgain={noop}
      onQuit={noop}
    />,
  );
  assertStringIncludes(html, "Table cleared!");
  assertStringIncludes(html, "1:23 left on the clock, in 12 shots with 1 foul");
  assertStringIncludes(html, "New best!");
});

Deno.test("running out of time shows the balls left", () => {
  const html = renderToStaticMarkup(
    <ResultScreen
      view={view({
        phase: "lost",
        seconds: 0,
        best: { timeLeft: 61, shots: 20 },
      })}
      onPlayAgain={noop}
      onQuit={noop}
    />,
  );
  assertStringIncludes(html, "4 balls left on the table after 12 shots");
  assertStringIncludes(html, "Best: cleared with 1:01 left, in 20 shots");
});

Deno.test("the HUD calls out a foul while the cue ball is in hand", () => {
  const html = renderToStaticMarkup(
    <Hud
      view={view({ phase: "placing", foul: "scratch", ballInHand: true })}
      onPause={noop}
      onMute={noop}
    />,
  );
  assertStringIncludes(html, "Scratch! −10s");
  assertStringIncludes(html, "Ball in hand: place the cue ball");
});
