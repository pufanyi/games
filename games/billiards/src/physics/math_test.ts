import { assertAlmostEquals, assertEquals } from "@std/assert";
import { expNeg } from "./math.ts";

Deno.test("expNeg matches Math.exp", () => {
  for (let x = 0; x <= 30; x += 0.037) {
    const expected = Math.exp(-x);
    assertAlmostEquals(expNeg(x), expected, expected * 1e-12);
  }
  assertEquals(expNeg(0), 1);
  assertEquals(expNeg(800), 0);
});
