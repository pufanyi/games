import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { GameOverScreen, ShopScreen } from "./screens.tsx";
import type { View } from "../runtime/session.ts";

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
    sticks: 0,
    canDynamite: false,
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

Deno.test("shop lists stocked slots and leaves out-of-stock slots empty", () => {
  const html = renderToStaticMarkup(
    <ShopScreen
      view={view({
        // The five slots in display order, as the original panel places them.
        offers: [
          { item: "dynamite", price: 40, available: true, sold: false },
          { item: "strength", price: 0, available: false, sold: false },
          { item: "clover", price: 30, available: true, sold: true },
          { item: "book", price: 450, available: true, sold: false },
          { item: "polish", price: 0, available: false, sold: false },
        ],
      })}
      onBuy={noop}
      onContinue={noop}
    />,
  );
  assertStringIncludes(html, "Level 2 cleared!");
  assertStringIncludes(html, "$300");
  assertStringIncludes(html, "The next goal is $2010");
  assertStringIncludes(buttonWith(html, "Dynamite"), 'aria-disabled="false"');
  // A slot without stock has no goods and no button at all.
  assertEquals(html.includes("Strength drink"), false);
  assertEquals(html.includes("Diamond polish"), false);
  assertStringIncludes(html, 'class="offer empty"');
  // Already bought.
  assertStringIncludes(buttonWith(html, "Lucky clover"), "Sold");
  assertStringIncludes(
    buttonWith(html, "Lucky clover"),
    'aria-disabled="true"',
  );
  // The purse never blocks a purchase: the price can overdraw it.
  assertStringIncludes(
    buttonWith(html, "Rock collector"),
    'aria-disabled="false"',
  );
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
