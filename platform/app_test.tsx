import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { type Assets, createHandler, type Files } from "./app.tsx";
import { games } from "./games.ts";

const ASSETS: Assets = { scripts: ["/static/test.js"], styles: [] };
const [game, other] = games;

/** Pretends only `built` games are published, and records what it served. */
function fakeFiles(built: string[] = []) {
  const served: string[] = [];
  const files: Files = {
    hasIndex: (slug) => Promise.resolve(built.includes(slug)),
    serve(req) {
      served.push(new URL(req.url).pathname);
      return Promise.resolve(new Response("file"));
    },
  };
  return { files, served };
}

function get(path: string, files: Files) {
  return createHandler(files, ASSETS)(new Request(`http://localhost${path}`));
}

Deno.test("catalog links published games directly and unbuilt games to their notice", async () => {
  const { files } = fakeFiles([game.slug]);
  const body = await (await get("/", files)).text();
  for (const listed of games) {
    const href = listed.slug === game.slug
      ? `/games/${listed.slug}/`
      : `/play/${listed.slug}`;
    assertStringIncludes(body, `href="${href}"`);
    assertStringIncludes(body, listed.title);
  }
  assertStringIncludes(body, `1 of ${games.length} playable`);
  assertStringIncludes(body, `<script type="module" src="/static/test.js">`);
});

Deno.test("page data can't break out of its script tag", async () => {
  const { files } = fakeFiles();
  const body = await (await get("/", files)).text();
  const data = body.split('<script id="page-data" type="application/json">')[1]
    .split("</script>")[0];
  assert(!data.includes("<"));
  assertEquals(JSON.parse(data).name, "catalog");
});

Deno.test("legacy play links redirect to the standalone game", async () => {
  const { files } = fakeFiles([game.slug]);
  for (const suffix of ["", "/", "?level=2"]) {
    const res = await get(`/play/${game.slug}${suffix}`, files);
    assertEquals(res.status, 302);
    assertEquals(
      res.headers.get("location"),
      `http://localhost/games/${game.slug}/${
        suffix.startsWith("?") ? suffix : ""
      }`,
    );
  }
});

Deno.test("play page shows coming soon for an unbuilt game", async () => {
  const { files } = fakeFiles([game.slug]);
  const body = await (await get(`/play/${other.slug}/`, files)).text();
  assertStringIncludes(body, "Coming soon");
  assert(!body.includes("<iframe"));
});

Deno.test("game build path without trailing slash redirects", async () => {
  const res = await get(`/games/${game.slug}`, fakeFiles().files);
  assertEquals(res.status, 301);
  assertEquals(
    res.headers.get("location"),
    `http://localhost/games/${game.slug}/`,
  );
});

Deno.test("game files and platform assets are served from files", async () => {
  const { files, served } = fakeFiles();
  for (
    const path of [
      `/games/${game.slug}/main.js`,
      "/static/x.css",
      "/assets/y.js",
    ]
  ) {
    assertEquals(await (await get(path, files)).text(), "file");
  }
  assertEquals(served, [
    `/games/${game.slug}/main.js`,
    "/static/x.css",
    "/assets/y.js",
  ]);
});

Deno.test("unknown games and paths are 404s that never touch files", async () => {
  const { files, served } = fakeFiles();
  for (const path of ["/play/nope", "/games/nope/", "/main.ts", "/deno.json"]) {
    const res = await get(path, files);
    assertEquals(res.status, 404);
    assertStringIncludes(await res.text(), "Game not found");
  }
  assertEquals(served, []);
});
