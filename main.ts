import { serveDir } from "@std/http/file-server";
import { findGame, games } from "./games.ts";
import { renderComingSoon, renderHome, renderNotFound } from "./views.ts";

const ROOT = import.meta.dirname;
if (!ROOT) throw new Error("main.ts must be run from a local file");
const GAMES_DIR = `${ROOT}/games`;
const STATIC_DIR = `${ROOT}/static`;

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function hasIndex(slug: string): Promise<boolean> {
  try {
    return (await Deno.stat(`${GAMES_DIR}/${slug}/index.html`)).isFile;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/") {
    const listings = await Promise.all(
      games.map(async (game) => ({
        ...game,
        playable: await hasIndex(game.slug),
      })),
    );
    return html(renderHome(listings));
  }

  if (pathname.startsWith("/static/")) {
    return serveDir(req, {
      fsRoot: STATIC_DIR,
      urlRoot: "static",
      quiet: true,
    });
  }

  const match = pathname.match(/^\/games\/([^/]+)(\/.*)?$/);
  if (match) {
    const game = findGame(match[1]);
    if (!game) return html(renderNotFound(), 404);

    // Redirect to the trailing-slash form so relative asset paths resolve
    // inside the game's folder.
    if (match[2] === undefined) {
      return Response.redirect(new URL(`${pathname}/`, url), 301);
    }
    if (match[2] === "/" && !(await hasIndex(game.slug))) {
      return html(renderComingSoon(game));
    }
    return serveDir(req, { fsRoot: GAMES_DIR, urlRoot: "games", quiet: true });
  }

  return html(renderNotFound(), 404);
}

if (import.meta.main) {
  Deno.serve(handler);
}
