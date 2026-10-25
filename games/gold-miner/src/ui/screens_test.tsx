import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { GameOverScreen, ShopScreen } from "./screens.tsx";
import { partnerStatus, RoomScreen } from "./OnlineScreen.tsx";
import type { OnlineView } from "../runtime/online.ts";
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
  assertStringIncludes(html, "$300");
  assertStringIncludes(html, "The next goal is $2010");
  assertStringIncludes(buttonWith(html, "Dynamite"), 'aria-disabled="false"');
  // Too expensive, and already bought.
  assertStringIncludes(
    buttonWith(html, "Diamond polish"),
    'aria-disabled="true"',
  );
  assertStringIncludes(buttonWith(html, "Lucky clover"), "Sold");
  assertStringIncludes(
    buttonWith(html, "Lucky clover"),
    'aria-disabled="true"',
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

function online(overrides: Partial<OnlineView> = {}): OnlineView {
  return {
    role: "host",
    status: "connected",
    error: "",
    link: "https://games.test/games/gold-miner/#room=abc",
    name: "Ada",
    players: ["Ada", null],
    partner: "",
    stalled: false,
    lobby: true,
    notice: null,
    ...overrides,
  };
}

function room(view: OnlineView) {
  return renderToStaticMarkup(
    <RoomScreen
      online={view}
      onStart={noop}
      onRename={noop}
      onLeave={noop}
    />,
  );
}

Deno.test("a waiting host sees the invite link, not a Start button", () => {
  const html = room(online());
  assertStringIncludes(html, 'value="Ada"');
  assertStringIncludes(html, "Waiting…");
  assertStringIncludes(html, "#room=abc");
  assert(!html.includes("Start game"));
});

Deno.test("once a friend joins, both seats show names and either can start", () => {
  const host = room(online({ players: ["Ada", "Bo"], partner: "Bo" }));
  assertStringIncludes(host, "Bo");
  assertStringIncludes(host, "Friend · Right miner");
  assert(!host.includes("#room=abc"), "the invite is no longer needed");
  assert(!buttonWith(host, "Start game").includes("disabled"));

  const guest = room(
    online({ role: "guest", name: "Bo", players: ["Ada", "Bo"] }),
  );
  assertStringIncludes(guest, "Friend · Left miner");
  assertStringIncludes(guest, "You · Right miner");
  assert(!buttonWith(guest, "Start game").includes("disabled"));
});

Deno.test("a closed room explains why and offers the way back", () => {
  const html = room(
    online({ status: "closed", error: "Your partner left the game." }),
  );
  assertStringIncludes(html, "Your partner left the game.");
  assertStringIncludes(html, "Back to title");
});

Deno.test("online shop says who is ready, by name", () => {
  const shop = (ready: boolean[]) =>
    renderToStaticMarkup(
      <ShopScreen
        view={view({
          online: online({ players: ["Ada", "Bo"], partner: "Bo" }),
          ready,
        })}
        onBuy={noop}
        onContinue={noop}
      />,
    );
  assertStringIncludes(shop([false, true]), "Bo is ready to go!");
  assertStringIncludes(shop([false, true]), "Ready for level 3");
  assertStringIncludes(
    buttonWith(shop([true, false]), "Waiting for Bo…"),
    "disabled",
  );
});

Deno.test("pause names the friend who dropped out", () => {
  assertEquals(
    partnerStatus(online({ partner: "Bo" })),
    "Bo disconnected. Waiting for them…",
  );
  assertEquals(
    partnerStatus(online({ players: ["Ada", "Bo"], partner: "Bo" })),
    "Either player can resume.",
  );
  assertEquals(
    partnerStatus(online({ status: "reconnecting" })),
    "Connection lost. Reconnecting…",
  );
});
