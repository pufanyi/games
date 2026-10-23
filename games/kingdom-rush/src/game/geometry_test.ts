import { assert, assertEquals } from "@std/assert";
import { clamp, ellipseRatio, inEllipse } from "./geometry.ts";

Deno.test("clamp keeps values inside the range", () => {
  assertEquals(clamp(5, 0, 10), 5);
  assertEquals(clamp(-3, 0, 10), 0);
  assertEquals(clamp(42, 0, 10), 10);
});

Deno.test("inEllipse uses the original's axis-aligned ellipse", () => {
  const centre = { x: 100, y: 100 };
  assert(inEllipse(centre, 100, 50, { x: 150, y: 100 }));
  assert(inEllipse(centre, 100, 50, { x: 100, y: 125 }));
  assert(inEllipse(centre, 100, 50, centre));
  assert(!inEllipse(centre, 100, 50, { x: 151, y: 100 }));
  assert(!inEllipse(centre, 100, 50, { x: 100, y: 126 }));
  // A zero-sized axis means nothing is in range, not a division by zero.
  assert(!inEllipse(centre, 0, 50, centre));
});

Deno.test("ellipseRatio reports 1 on the edge and 0 at the centre", () => {
  const centre = { x: 0, y: 0 };
  assertEquals(ellipseRatio(centre, 100, 50, centre), 0);
  assertEquals(ellipseRatio(centre, 100, 50, { x: 50, y: 0 }), 1);
  assertEquals(ellipseRatio(centre, 100, 50, { x: 0, y: -25 }), 1);
});
