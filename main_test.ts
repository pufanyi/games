import { assertEquals, assertStringIncludes } from "@std/assert";
import { handler } from "./main.ts";
import { games } from "./games.ts";

function get(path: string): Promise<Response> {
  return handler(new Request(`http://localhost${path}`));
}

Deno.test("landing page lists every game", async () => {
  const res = await get("/");
  assertEquals(res.status, 200);
  const body = await res.text();
  for (const game of games) {
    assertStringIncludes(body, `href="/games/${game.slug}/"`);
    assertStringIncludes(body, game.title);
  }
});

Deno.test("unbuilt game shows a coming soon page", async () => {
  const [game] = games;
  const res = await get(`/games/${game.slug}/`);
  assertEquals(res.status, 200);
  assertStringIncludes(await res.text(), "hasn't been built yet");
});

Deno.test("game path without trailing slash redirects", async () => {
  const [game] = games;
  const res = await get(`/games/${game.slug}`);
  assertEquals(res.status, 301);
  assertEquals(
    res.headers.get("location"),
    `http://localhost/games/${game.slug}/`,
  );
});

Deno.test("unknown game returns 404", async () => {
  const res = await get("/games/does-not-exist/");
  assertEquals(res.status, 404);
  await res.body?.cancel();
});

Deno.test("serves static assets", async () => {
  const res = await get("/static/styles.css");
  assertEquals(res.status, 200);
  assertStringIncludes(res.headers.get("content-type") ?? "", "text/css");
  await res.body?.cancel();
});
