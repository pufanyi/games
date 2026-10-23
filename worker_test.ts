import { assertEquals, assertStringIncludes } from "@std/assert";
import worker from "./worker.ts";
import { games } from "./games.ts";

// Stands in for the Workers ASSETS binding: serves a fixed set of paths.
function assets(files: Record<string, string>) {
  const requested: string[] = [];
  return {
    requested,
    fetch(input: Request | string): Promise<Response> {
      const { pathname } = new URL(
        input instanceof Request ? input.url : input,
      );
      requested.push(pathname);
      const body = files[pathname];
      return Promise.resolve(
        body === undefined
          ? new Response(null, { status: 404 })
          : new Response(body),
      );
    },
  };
}

function get(path: string, ASSETS: ReturnType<typeof assets>) {
  return worker.fetch(new Request(`https://arcade.test${path}`), { ASSETS });
}

Deno.test("worker marks games with an index as playable", async () => {
  const [game] = games;
  const ASSETS = assets({ [`/games/${game.slug}/`]: "<p>game</p>" });
  const body = await (await get("/", ASSETS)).text();
  assertStringIncludes(body, `1 of ${games.length} playable`);
});

Deno.test("worker serves game files from ASSETS", async () => {
  const [game] = games;
  const ASSETS = assets({ [`/games/${game.slug}/`]: "<p>game</p>" });
  const res = await get(`/games/${game.slug}/`, ASSETS);
  assertEquals(await res.text(), "<p>game</p>");
});

Deno.test("worker routes before touching ASSETS", async () => {
  const ASSETS = assets({ "/main.ts": "secret" });
  const res = await get("/main.ts", ASSETS);
  assertEquals(res.status, 404);
  assertStringIncludes(await res.text(), "Game not found");
  assertEquals(ASSETS.requested, []);
});
