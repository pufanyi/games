import { findGame, games } from "./games.ts";
import { renderComingSoon, renderHome, renderNotFound } from "./views.ts";

/** How a runtime reaches the files in `static/` and `games/`. */
export interface Files {
  /** Whether `games/<slug>/index.html` exists. */
  hasIndex(slug: string): Promise<boolean>;
  /** Serves the file at the request's path, under `static/` or `games/`. */
  serve(req: Request): Promise<Response>;
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export function createHandler(files: Files) {
  return async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const { pathname } = url;

    if (pathname === "/") {
      const listings = await Promise.all(
        games.map(async (game) => ({
          ...game,
          playable: await files.hasIndex(game.slug),
        })),
      );
      return html(renderHome(listings));
    }

    if (pathname.startsWith("/static/")) return files.serve(req);

    const match = pathname.match(/^\/games\/([^/]+)(\/.*)?$/);
    if (match) {
      const game = findGame(match[1]);
      if (!game) return html(renderNotFound(), 404);

      // Redirect to the trailing-slash form so relative asset paths resolve
      // inside the game's folder.
      if (match[2] === undefined) {
        return Response.redirect(new URL(`${pathname}/`, url), 301);
      }
      if (match[2] === "/" && !(await files.hasIndex(game.slug))) {
        return html(renderComingSoon(game));
      }
      return files.serve(req);
    }

    return html(renderNotFound(), 404);
  };
}
