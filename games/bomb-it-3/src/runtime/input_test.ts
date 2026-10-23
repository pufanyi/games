import { assertEquals } from "@std/assert";
import { Controls } from "./input.ts";
Deno.test("two players have independent direction and attack keys", () => {
  const c = new Controls(2);
  c.key("KeyW", true);
  c.key("ArrowRight", true);
  c.key("Enter", true);
  assertEquals(c.read(), [{ direction: "up", action: false }, {
    direction: "right",
    action: true,
  }]);
  c.key("Space", true);
  c.key("Enter", false);
  assertEquals(c.read()[0].action, true);
  assertEquals(c.read()[1].action, false);
});
Deno.test("last pressed direction wins; releasing it restores the earlier direction", () => {
  const c = new Controls(1);
  c.key("ArrowUp", true);
  c.key("ArrowRight", true);
  assertEquals(c.read()[0].direction, "right");
  c.key("ArrowRight", false);
  assertEquals(c.read()[0].direction, "up");
});
Deno.test("multitouch ownership and cancellation cannot release another finger's action", () => {
  const c = new Controls(1);
  c.pointer(1, "up");
  c.pointer(2, "action");
  c.pointer(3, "action");
  c.pointer(2, null);
  assertEquals(c.read()[0], { direction: "up", action: true });
  c.clear();
  c.pointer(3, null);
  assertEquals(c.read()[0], { direction: null, action: false });
});
