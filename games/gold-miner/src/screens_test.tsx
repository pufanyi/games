import { assert, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { GameOverScreen, ShopScreen } from "./screens.tsx";
import type { View } from "./session.ts";

const noop = () => {};

function view(overrides: Partial<View> = {}): View {
  return {
    mode: "game",
    paused: false,
    muted: false,
    phase: "shop",
    level: 2,
    money: 300,
    goal: 1195,
    nextGoal: 2010,
    dynamite: 0,
    offers: [],
    best: null,
    newBest: false,
    ...overrides,
  };
}

/** The `<button>` whose markup contains `text`. */
function buttonWith(html: string, text: string): string {
  const button = html.split("<button").find((part) => part.includes(text));
  assert(button, `no button with ${text}`);
  return button;
}

Deno.test("shop lists offers and disables what you can't buy", () => {
  const html = renderToStaticMarkup(
    <ShopScreen
      view={view({
        offers: [
          { item: "dynamite", price: 40, sold: false },
          { item: "polish", price: 450, sold: false },
          { item: "clover", price: 30, sold: true },
        ],
      })}
      onBuy={noop}
      onContinue={noop}
    />,
  );
  assertStringIncludes(html, "Level 2 cleared!");
  assertStringIncludes(html, "The next goal is $2010");
  assert(!buttonWith(html, "Dynamite").includes("disabled"));
  assertStringIncludes(buttonWith(html, "Diamond polish"), "disabled"); // too expensive
  assertStringIncludes(buttonWith(html, "Lucky clover"), "Bought");
  assertStringIncludes(buttonWith(html, "Lucky clover"), "disabled");
  assertStringIncludes(html, "Start level 3");
});

Deno.test("game over celebrates a new best, or shows the old one", () => {
  const fresh = renderToStaticMarkup(
    <GameOverScreen
      view={view({ phase: "gameOver", newBest: true })}
      onPlayAgain={noop}
      onQuit={noop}
    />,
  );
  assertStringIncludes(fresh, "New best!");

  const old = renderToStaticMarkup(
    <GameOverScreen
      view={view({ phase: "gameOver", best: { level: 4, money: 3200 } })}
      onPlayAgain={noop}
      onQuit={noop}
    />,
  );
  assertStringIncludes(old, "Best: level 4 with $3200");
  assertStringIncludes(old, "You missed the $1195 goal on level 2");
});
