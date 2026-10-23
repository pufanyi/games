import { assert, assertAlmostEquals } from "@std/assert";
import { Vector3 } from "three";
import { BALL_RADIUS as R } from "../physics/constants.ts";
import { TableCamera } from "./camera.ts";

Deno.test("both camera projections map ball centers back to table meters", () => {
  const cameras = new TableCamera();
  for (const view of ["top", "table"] as const) {
    cameras.view = view;
    for (const [x, y] of [[0, 0], [-0.8, 0.2], [1.1, 0.5], [-1.1, -0.5]]) {
      const screen = new Vector3(x, y, R).project(cameras.active);
      assert(Math.abs(screen.x) < 0.875, `${view}: outside side controls`);
      assert(screen.y < 0.75 && screen.y > -1, `${view}: outside play area`);
      const point = cameras.toTable(screen.x, screen.y);
      assert(point);
      assertAlmostEquals(point[0], x, 1e-10);
      assertAlmostEquals(point[1], y, 1e-10);
    }
  }
});

Deno.test("CSS resizing and pixel density do not change table picking", () => {
  const cameras = new TableCamera();
  for (const view of ["table", "top"] as const) {
    cameras.view = view;
    const screen = new Vector3(-0.9, -0.25, R).project(cameras.active);
    for (
      const [width, height, left, top] of [[1280, 720, 0, 0], [
        693.33,
        390,
        75.33,
        0,
      ], [390, 219.375, 0, 300]]
    ) {
      const clientX = left + (screen.x + 1) / 2 * width;
      const clientY = top + (1 - screen.y) / 2 * height;
      const point = cameras.toTable(
        (clientX - left) / width * 2 - 1,
        1 - (clientY - top) / height * 2,
      );
      assert(point);
      assertAlmostEquals(point[0], -0.9, 1e-10);
      assertAlmostEquals(point[1], -0.25, 1e-10);
    }
  }
});
