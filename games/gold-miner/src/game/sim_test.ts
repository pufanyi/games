import { assert, assertEquals, assertNotEquals } from "@std/assert";
import {
  goalFor,
  LAYOUT_KINDS,
  loadMine,
  rollBag,
  stepAnimals,
  themeFor,
} from "./level.ts";
import { type Item, KINDS } from "./items.ts";
import {
  clawAngle,
  clawTip,
  createGame,
  type GameState,
  isBusy,
  step,
} from "./sim.ts";
import {
  ANIMAL,
  EXTENSION_END_FRAME,
  FRAME_STEP,
  PAYOUT_FRAME,
  retractLocalY,
  retractStart,
  SCALE,
  SWING_DEGREES,
  SWING_LAST_FRAME,
  swingDegrees,
} from "./original.ts";
import {
  LEVEL_SECONDS,
  MAX_LENGTH,
  PIVOT_X,
  PIVOT_Y,
  REST_LENGTH,
} from "./config.ts";
import { rollOffers, SHOP_ORDER } from "./shop.ts";
import { LAYOUTS } from "./layouts.ts";

/**
 * Steps with the swing pinned straight down, so the claw timeline can be
 * tested without the (measured) swing drift carrying the claw off target.
 */
function stepAimed(state: GameState, fire = false) {
  for (const player of state.players) {
    player.swingFrame = SWING_LAST_FRAME - FRAME_STEP;
  }
  step(state, fire ? [{ player: 0, action: "fire" }] : []);
}

/** A game with `items` straight below the winch, ready to aim at. */
function aimed(state: GameState, items: Partial<Item>[]) {
  state.items = items.map((item, index) => {
    const kind = item.kind ?? "goldSmall";
    const spec = KINDS[kind];
    return {
      id: 900 + index,
      kind,
      x: PIVOT_X,
      y: 300,
      weight: spec.weight,
      price: spec.value,
      hitW: spec.hitW,
      hitH: spec.hitH,
      artW: spec.artW,
      artH: spec.artH,
      ...item,
    };
  });
  return state;
}

/** Fires and steps (swing pinned) until the claw is back to swinging. */
function reelIn(state: GameState, limit = 10_000): number {
  let ticks = 0;
  stepAimed(state, true);
  while (state.players[0].claw.state !== "swing" && ticks < limit) {
    stepAimed(state);
    ticks++;
  }
  assert(ticks < limit, "the claw never came back");
  return ticks;
}

Deno.test("goals match the original's cumulative ladder", () => {
  assertEquals(
    [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
    ].map(goalFor),
    [
      650,
      1195,
      2010,
      3095,
      4450,
      6075,
      7970,
      10135,
      12570,
      15275,
      17980,
      20685,
    ],
  );
});

Deno.test("themes run 1-10, then cycle 4-10", () => {
  assertEquals([1, 5, 10].map(themeFor), [1, 5, 10]);
  assertEquals([11, 12, 17, 18, 25].map(themeFor), [4, 5, 10, 4, 4]);
});

Deno.test("30 recovered layouts cover every theme and variant", () => {
  assertEquals(LAYOUTS.length, 10);
  for (const theme of LAYOUTS) {
    assertEquals(theme.length, 3);
    for (const layout of theme) {
      assert(layout.length > 0, "empty layout");
      for (const entry of layout) {
        assert(LAYOUT_KINDS.includes(entry.kind), entry.kind);
        assert(entry.y > PIVOT_Y, "an item sits above the winch");
      }
    }
  }
});

Deno.test("the swing table runs from 6 degrees to 0 and wraps", () => {
  assertEquals(SWING_DEGREES[0], 6);
  assertEquals(SWING_DEGREES[SWING_DEGREES.length - 1], 0);
  assertEquals(swingDegrees(3), 6);
  assertEquals(swingDegrees(86), 0);
  // The one-frame jump from frame 86 back to frame 3 is interpolated.
  assert(swingDegrees(86.5) > 0 && swingDegrees(86.5) < 6);
  assertEquals(swingDegrees(87), 6);
});

Deno.test("extension and retract timelines use the measured local y", () => {
  assertEquals(retractStart(2), { frame: 288, localY: 66.4 });
  assertEquals(retractStart(42), { frame: 44, localY: 404.1 });
  // Frame 2 is 12.45; each frame of extension adds 9.86.
  assertEquals(Math.round((12.45 + 40 * 9.86) * 100) / 100, 406.85);
  // The retract timeline is monotonic from the longest rope to delivery.
  assert(retractLocalY(288) > retractLocalY(293));
  assertEquals(retractLocalY(PAYOUT_FRAME), 59.5);
});

Deno.test("a new game opens level 1 with its measured setup", () => {
  const state = createGame(7);
  assertEquals(state.level, 1);
  assertEquals(state.goal, 650);
  assertEquals(state.timeLeft, LEVEL_SECONDS);
  assertEquals(state.money, 0);
  assertEquals(state.sticks, 0);
  assertEquals(state.minerStrength, 10);
  assertEquals(state.phase, "playing");
  assertEquals(state.players[0].claw.state, "swing");
  assertEquals(state.players[0].claw.length, REST_LENGTH);
  const frames = state.players[0].swingFrame;
  assert(frames >= 3 && frames <= 84, String(frames));
  const theme = LAYOUTS[0];
  assert(
    theme.some((layout) => layout.length === state.items.length),
    "level 1 items do not come from a theme-1 layout",
  );
});

Deno.test("the swing keeps playing while the claw is out", () => {
  const state = createGame(3);
  state.items = [];
  const start = state.players[0].swingFrame;
  step(state, [{ player: 0, action: "fire" }]);
  for (let i = 0; i < 10; i++) step(state);
  assertNotEquals(state.players[0].swingFrame, start);
  for (let i = 0; i < 400; i++) {
    step(state);
    const frame = state.players[0].swingFrame;
    assert(frame >= 3 && frame < SWING_LAST_FRAME + 1, String(frame));
  }
});

Deno.test("an empty shot extends to the clip's end and returns fast", () => {
  const state = aimed(createGame(4), []);
  const player = state.players[0];
  stepAimed(state, true);
  let peak = 0;
  let ticks = 0;
  while (player.claw.state !== "swing" && ticks < 1_000) {
    stepAimed(state);
    peak = Math.max(peak, player.claw.length);
    ticks++;
  }
  assertEquals(player.claw.state, "swing");
  assertEquals(player.claw.length, REST_LENGTH);
  // The extension peak is frame 42; the empty clip pulls back to up42.
  assert(peak > MAX_LENGTH - 0.5, `${peak}`);
  assert(peak <= MAX_LENGTH, `${peak}`);
  // ~140 ticks out, then the `stickBonus` path at 15 frames/frame.
  const retractTicks = (PAYOUT_FRAME - EXTENSION_END_FRAME) / (15 * FRAME_STEP);
  assert(
    Math.abs(ticks - (140 + retractTicks)) < 12,
    `empty trip took ${ticks}`,
  );
  assertEquals(state.money, 0);
});

Deno.test("the claw points along the rope and reports its tip", () => {
  const state = createGame(5);
  const player = state.players[0];
  player.swingFrame = 86;
  player.claw.length = 300;
  assertEquals(Math.round(clawAngle(player) * 1000) / 1000, 0);
  const tip = clawTip(player);
  assert(Math.abs(tip.x - PIVOT_X) < 1e-9);
  assertEquals(tip.y, PIVOT_Y + 300);
  // A positive table angle swings the tip left of the winch.
  player.swingFrame = 20;
  assert(clawAngle(player) < 0);
  assert(clawTip(player).x < PIVOT_X);
});

Deno.test("a grab snaps to the matching upN retract label", () => {
  const state = aimed(createGame(6), [{ kind: "goldSmall", y: 300 }]);
  const claw = state.players[0].claw;
  stepAimed(state, true);
  let guard = 0;
  while (claw.state === "extend" && guard++ < 500) stepAimed(state);
  assertEquals(claw.state, "retract");
  assertEquals(claw.item?.kind, "goldSmall");
  const grabbed = claw.frame;
  // Gold weighs 3, so strength 10 reels at 7 frames of clip per frame.
  assertEquals(claw.speed, 7);
  assert(grabbed >= 44, String(grabbed));
  // The snap lands exactly on a measured upN key frame.
  assert(
    Array.from({ length: 41 }, (_, n) => retractStart(n + 2).frame).includes(
      grabbed,
    ),
    `frame ${grabbed} is not an upN label`,
  );
  assert(Math.abs(claw.length - retractLocalY(grabbed) * SCALE) < 1e-9);
});

Deno.test("heavy items reel in slower than light ones", () => {
  const light = aimed(createGame(8), [{ kind: "goldSmall", y: 300 }]);
  const heavy = aimed(createGame(8), [{ kind: "goldHuge", y: 300 }]);
  const lightTicks = reelIn(light);
  const heavyTicks = reelIn(heavy);
  assertEquals(heavy.players[0].claw.state, "swing");
  assert(heavyTicks > lightTicks * 1.8, `${lightTicks} vs ${heavyTicks}`);
});

Deno.test("payout pays once and resets the swing", () => {
  const state = aimed(createGame(9), [{ kind: "diamond", y: 300 }]);
  const player = state.players[0];
  reelIn(state);
  assertEquals(state.money, KINDS.diamond.value);
  assertEquals(player.claw.state, "swing");
  assertEquals(player.claw.item, null);
  assertEquals(player.claw.length, REST_LENGTH);
  assertEquals(state.items.length, 0);
  const money = state.money;
  for (let i = 0; i < 200; i++) stepAimed(state);
  assertEquals(state.money, money);
});

Deno.test("reel speed is strength minus weight, plus one light frame", () => {
  const diamond = aimed(createGame(10), [{ kind: "diamond", y: 300 }]);
  const claw = diamond.players[0].claw;
  stepAimed(diamond, true);
  while (claw.state === "extend") stepAimed(diamond);
  // Weight 2: strength 10 reels 8 frames of clip per frame, no bonus frame.
  assertEquals(claw.speed, 8);
  assert(
    Array.from({ length: 41 }, (_, n) => retractStart(n + 2).frame).includes(
      claw.frame,
    ),
  );

  // A weight-1 bag gets one natural frame of the clip before the handler.
  const bag = aimed(createGame(10), [
    { kind: "bag", price: 40, weight: 1, y: 300 },
  ]);
  const bagClaw = bag.players[0].claw;
  stepAimed(bag, true);
  while (bagClaw.state === "extend") stepAimed(bag);
  assertEquals(bagClaw.speed, 9);
  const labels = Array.from(
    { length: 41 },
    (_, n) => retractStart(n + 2).frame,
  );
  assert(
    labels.some((frame) => frame + 1 === bagClaw.frame),
    `frame ${bagClaw.frame} is not an upN label plus one`,
  );
});

Deno.test("a weight -1 bag takes the fast path", () => {
  const state = aimed(createGame(11), [{ kind: "bag", weight: -1, y: 300 }]);
  const claw = state.players[0].claw;
  stepAimed(state, true);
  while (claw.state === "extend") stepAimed(state);
  assertEquals(claw.stickBonus, true);
  assertEquals(claw.speed, 15);
});

Deno.test("a power bag grants temporary strength at its payout frame", () => {
  const state = aimed(createGame(12), [
    { kind: "bag", price: "power", weight: 1, y: 300 },
  ]);
  reelIn(state);
  assertEquals(state.temporaryStrength, true);
  assertEquals(state.money, 0);
});

Deno.test("a dynamite bag adds a stick", () => {
  const state = aimed(createGame(13), [
    { kind: "bag", price: "dynamite", weight: 1, y: 300 },
  ]);
  reelIn(state);
  assertEquals(state.sticks, 1);
});

Deno.test("dynamite only throws while reeling something in", () => {
  const state = aimed(createGame(14), [{ kind: "goldHuge", y: 300 }]);
  state.sticks = 1;
  stepAimed(state);
  step(state, [{ player: 0, action: "dynamite" }]);
  assertEquals(state.sticks, 1);
  assertEquals(state.projectiles.length, 0);

  stepAimed(state, true);
  while (state.players[0].claw.state !== "retract") stepAimed(state);
  stepAimed(state);
  step(state, [{ player: 0, action: "dynamite" }]);
  assertEquals(state.sticks, 0);
  assertEquals(state.projectiles.length, 1);
});

Deno.test("a dynamite hit clears the held item and speeds the reel", () => {
  const state = aimed(createGame(15), [{ kind: "goldHuge", y: 300 }]);
  state.sticks = 1;
  const player = state.players[0];
  stepAimed(state, true);
  while (player.claw.state !== "retract") stepAimed(state);
  step(state, [{ player: 0, action: "dynamite" }]);
  let guard = 0;
  while (state.projectiles.length > 0 && guard++ < 500) stepAimed(state);
  assertEquals(player.claw.item, null);
  assertEquals(player.claw.speed, 15);
  assertEquals(state.blasts.length, 1);
  // The bag of $0 arrives after the blast delay.
  reelIn(state);
  assertEquals(state.money, 0);
});

Deno.test("a grabbed barrel blasts nearby items and chains to other barrels", () => {
  const state = aimed(createGame(16), [
    { kind: "tnt", y: 350 },
    { kind: "tnt", y: 420 },
    { kind: "goldSmall", y: 430 },
    { kind: "goldSmall", y: 550 },
  ]);
  const player = state.players[0];
  stepAimed(state, true);
  while (player.claw.state !== "retract") stepAimed(state);
  assertEquals(player.claw.item?.kind, "tnt");
  // Its explosion box appears eight original frames after the grab.
  let guard = 0;
  while (state.blasts.length > 0 && guard++ < 100) stepAimed(state);
  // The near barrel and the gold beside it go; so does the chained barrel's
  // neighbour, but the far gold at y 550 survives.
  assertEquals(state.items.map((item) => item.id), [903]);
});

Deno.test("the timer counts 18 frames a second, 21 under ten", () => {
  const state = createGame(17);
  state.items = [];
  for (let i = 0; i < 60; i++) step(state);
  assertEquals(state.timeLeft, LEVEL_SECONDS - 1);

  // 48 more normal seconds bring it to 11.
  for (let i = 0; i < 48 * 60; i++) step(state);
  assertEquals(state.timeLeft, 11);
  // The step down to 10 still uses the normal period.
  for (let i = 0; i < 18 * (1 / FRAME_STEP); i++) step(state);
  assertEquals(state.timeLeft, 10);
  // Now each second takes 21 frames.
  for (let i = 0; i < 21 * (1 / FRAME_STEP); i++) step(state);
  assertEquals(state.timeLeft, 9);
});

Deno.test("a cash payout holds the clock at zero instead of ending the level", () => {
  const state = createGame(18);
  state.items = [];
  state.timeLeft = 0;
  state.timer = 17.9; // one tick from the check
  const claw = state.players[0].claw;
  claw.state = "payout";
  claw.payoutKind = "cash";
  claw.payoutFrame = 2;
  claw.payoutAmount = 100;

  step(state);
  assertEquals(state.timeLeft, 0);
  assertEquals(state.phase, "playing");
  assert(isBusy(state));
  // The timer retries rather than resetting: it keeps a sub-frame remainder.
  assert(state.timer < 1, String(state.timer));

  // The payout ends at frame 32; the next timer check then ends the level
  // because the money is short of the goal.
  let guard = 0;
  while (state.phase === "playing" && guard++ < 500) step(state);
  assertEquals(state.phase, "gameOver");
  assertEquals(state.money, 100);
});

Deno.test("time running out below the goal ends the game, not the level list", () => {
  const state = createGame(19);
  state.items = [];
  state.timeLeft = 1;
  state.timer = 20.9;
  step(state);
  assertEquals(state.timeLeft, 0);
  assertEquals(state.phase, "gameOver");
});

Deno.test("bags roll the measured prizes and weights", () => {
  const rng = { rng: 12345 };
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const bag = rollBag(rng, false, 0);
    if (typeof bag.price === "number") {
      assert(
        bag.price === 800 || (bag.price >= 1 && bag.price <= 600),
        String(bag.price),
      );
    } else {
      seen.add(bag.price);
    }
    assert(
      bag.weight === 9 || bag.weight === -1 ||
        (bag.weight >= -5 && bag.weight <= 9),
      String(bag.weight),
    );
  }
  assert(seen.has("power"));
  assert(seen.has("dynamite"));

  // With four sticks already, a "dynamite" roll pays cash instead.
  const loaded = { rng: 999 };
  for (let i = 0; i < 100; i++) {
    const bag = rollBag(loaded, false, 4);
    assertNotEquals(bag.price, "dynamite");
  }
  const lucky = { rng: 7 };
  for (let i = 0; i < 100; i++) {
    const bag = rollBag(lucky, true, 0);
    if (typeof bag.price === "number") {
      assert(bag.price === 700 || (bag.price >= 300 && bag.price <= 599));
    }
  }
});

Deno.test("the shop rolls five slots in the original's order and ranges", () => {
  const state = { rng: 42 };
  const offers = rollOffers(state, 3, 0);
  assertEquals(offers.map((offer) => offer.item), [...SHOP_ORDER]);
  for (const offer of offers) {
    assertEquals(offer.sold, false);
    if (!offer.available) {
      assertEquals(offer.price, 0);
      continue;
    }
    assert(offer.price > 0);
    switch (offer.item) {
      case "dynamite":
        assert(offer.price >= 1 + 6 && offer.price <= 300 + 6);
        break;
      case "strength":
        assert(offer.price >= 100 && offer.price <= 399);
        break;
      case "clover":
        assert(offer.price >= 1 + 6 && offer.price <= 150 + 6);
        break;
      case "book":
        assert(offer.price >= 1 && offer.price <= 150);
        break;
      case "polish":
        assert(offer.price >= 201 && offer.price <= 500);
        break;
    }
  }
});

Deno.test("dynamite is never stocked with five sticks", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const offers = rollOffers({ rng: seed }, 2, 5);
    const dynamite = offers.find((offer) => offer.item === "dynamite");
    assertEquals(dynamite?.available, false);
    assertEquals(dynamite?.price, 0);
  }
});

Deno.test("buying spends money even into the negative", () => {
  const state = createGame(20);
  state.phase = "shop";
  state.timeLeft = 0;
  state.money = 10;
  state.shop = {
    offers: [
      { item: "strength", price: 250, available: true, sold: false },
      { item: "clover", price: 0, available: false, sold: false },
    ],
  };
  step(state, [{ player: 0, action: "buy", item: "strength" }]);
  assertEquals(state.money, -240);
  assertEquals(state.minerStrength, 12);
  assertEquals(state.shop?.offers[0].sold, true);
  // A second click does nothing, and an out-of-stock slot can't be bought.
  step(state, [{ player: 0, action: "buy", item: "strength" }]);
  step(state, [{ player: 0, action: "buy", item: "clover" }]);
  assertEquals(state.money, -240);
  assertEquals(state.minerStrength, 12);
});

Deno.test("continuing from the shop starts the next level clean", () => {
  const state = createGame(21);
  state.phase = "shop";
  state.money = 900;
  state.bonuses = { clover: false, rock: false, diamond: false };
  state.temporaryStrength = true;
  state.shop = {
    offers: [{ item: "book", price: 200, available: true, sold: false }],
  };
  step(state, [{ player: 0, action: "buy", item: "book" }]);
  step(state, [{ player: 0, action: "continue" }]);
  assertEquals(state.phase, "playing");
  assertEquals(state.level, 2);
  assertEquals(state.goal, 1195);
  assertEquals(state.timeLeft, LEVEL_SECONDS);
  assertEquals(state.temporaryStrength, false);
  assertEquals(state.bonuses.diamond, false);
  assertEquals(state.bonuses.rock, true);
  assertEquals(state.items.length > 0, true);
});

Deno.test("shop entry resets strength and previous bonuses", () => {
  const state = createGame(22);
  state.items = [];
  state.money = 5000;
  state.goal = 100;
  state.minerStrength = 12;
  state.bonuses = { clover: true, rock: true, diamond: true };
  state.players[0].claw.state = "swing";
  state.timeLeft = 0;
  state.timer = 17.9;
  step(state);
  assertEquals(state.phase, "shop");
  assertEquals(state.minerStrength, 10);
  assertEquals(state.bonuses, { clover: false, rock: false, diamond: false });
});

Deno.test("animals patrol their tunnel and pause at each end", () => {
  const state = createGame(23);
  const spec = KINDS.mole;
  const anchor = PIVOT_X;
  const mole: Item = {
    id: 800,
    kind: "mole",
    x: anchor,
    y: 300,
    weight: spec.weight,
    price: spec.value,
    hitW: spec.hitW,
    hitH: spec.hitH,
    artW: spec.artW,
    artH: spec.artH,
    animal: {
      anchorX: anchor,
      facing: 1,
      localX: ANIMAL.startX,
      phase: "left",
      hold: 0,
    },
  };
  state.items = [mole];
  const startX = mole.x;
  for (let i = 0; i < 200; i++) stepAnimals(state.items, state);
  assert(mole.x < startX, "the animal should walk left");
  assert(mole.x < anchor, "the body stays left of its layout anchor");
  // It reaches the far end, waits, then comes back toward the anchor.
  let closest = mole.x;
  for (let i = 0; i < 5_000; i++) {
    stepAnimals(state.items, state);
    closest = Math.max(closest, mole.x);
  }
  assert(closest > mole.x, "the animal should turn around");
  assert(Math.abs(closest - anchor) < 12, `${closest} vs ${anchor}`);

  // Facing mirrors the walk: the other side of the layout moves right.
  mole.animal = {
    anchorX: anchor,
    facing: -1,
    localX: ANIMAL.startX,
    phase: "left",
    hold: 0,
  };
  mole.x = anchor;
  for (let i = 0; i < 100; i++) stepAnimals(state.items, state);
  assert(mole.x > anchor + 100, `${mole.x} vs ${anchor}`);
});

Deno.test("levels roll bags, diamonds, and rocks with their bonuses", () => {
  const plain = loadMine({ rng: 3, nextId: 1 }, 1, {
    clover: false,
    rock: false,
    diamond: false,
  }, 0);
  const boosted = loadMine({ rng: 3, nextId: 1 }, 1, {
    clover: false,
    rock: true,
    diamond: true,
  }, 0);
  const pig = boosted.items.find((item) => item.kind === "pig");
  if (pig) assertEquals(pig.price, 902);
  const rock = plain.items.find((item) => item.kind === "rockSmall");
  const richRock = boosted.items.find((item) => item.kind === "rockSmall");
  if (rock && richRock) {
    assertEquals(rock.price, KINDS.rockSmall.value);
    assertEquals(richRock.price, KINDS.rockSmall.value * 3);
  }
  assertEquals(plain.theme, 1);
  assertEquals(boosted.items.length, plain.items.length);
});

Deno.test("a game state survives a JSON round trip mid-shot", () => {
  const state = aimed(createGame(24), [{ kind: "goldMedium", y: 300 }]);
  stepAimed(state, true);
  for (let i = 0; i < 40; i++) stepAimed(state);
  const copy = JSON.parse(JSON.stringify(state)) as GameState;
  assertEquals(copy, state);
});

Deno.test("rolling a layout consumes the same random draws every time", () => {
  const a = loadMine({ rng: 99, nextId: 1 }, 4, {
    clover: true,
    rock: false,
    diamond: false,
  }, 2);
  const b = loadMine({ rng: 99, nextId: 1 }, 4, {
    clover: true,
    rock: false,
    diamond: false,
  }, 2);
  assertEquals(a, b);
  assertEquals(a.theme, 4);
});
