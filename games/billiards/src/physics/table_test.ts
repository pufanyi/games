import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import { TABLE } from "./table.ts";

const near = (a: number, b: number) => Math.abs(a - b) < 1e-12;

Deno.test("the cushions run unbroken around the table", () => {
  assertEquals(TABLE.pockets.length, 6);
  // Per pocket: the jaw it's entered by, the jaw it's left by, the next rail.
  assertEquals(TABLE.cushions.length, 18);
  for (let i = 0; i < 6; i++) {
    const leave = TABLE.cushions[i * 3 + 1];
    const rail = TABLE.cushions[i * 3 + 2];
    const enter = TABLE.cushions[(i * 3 + 3) % 18];
    assert(near(rail.ax, leave.ax) && near(rail.ay, leave.ay));
    assert(near(rail.bx, enter.ax) && near(rail.by, enter.ay));
  }
});

Deno.test("pocket mouths are regulation width", () => {
  for (let i = 0; i < 6; i++) {
    const enter = TABLE.cushions[i * 3];
    const leave = TABLE.cushions[i * 3 + 1];
    const mouth = Math.sqrt(
      (enter.ax - leave.ax) ** 2 + (enter.ay - leave.ay) ** 2,
    );
    assertAlmostEquals(mouth, i % 3 === 1 ? 0.129 : 0.114, 1e-9);
  }
});

Deno.test("every jaw ends over its pocket, so no ball slips past", () => {
  TABLE.pockets.forEach((pocket, i) => {
    for (const jaw of [TABLE.cushions[i * 3], TABLE.cushions[i * 3 + 1]]) {
      const d = Math.sqrt((jaw.bx - pocket.x) ** 2 + (jaw.by - pocket.y) ** 2);
      assert(d < pocket.radius - 0.005, `pocket ${i}: ${d}`);
    }
  });
});
