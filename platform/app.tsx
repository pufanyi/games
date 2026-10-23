// Request routing for the platform, shared by every runtime: `main.ts` (Deno),
// `worker.ts` (Cloudflare), and the Vite dev server (`platform/dev.ts`). Each
// supplies only file access and the URLs of the platform's browser assets.
import { renderToString } from "react-dom/server";
import { findGame, games } from "./games.ts";
import { type Page, pageTitle, PageView } from "./pages.tsx";

/** How a runtime reaches the published files (platform assets and games). */
export interface Files {
  /** Whether `/games/<slug>/index.html` is published. */
  hasIndex(slug: string): Promise<boolean>;
  /** Serves the published file at the request's path. */
  serve(req: Request): Promise<Response>;
}

/** Script and stylesheet URLs to include in every platform page. */
export interface Assets {
  scripts: string[];
  styles: string[];
}

/** Where `vite build` writes the platform's browser assets (vite.config.ts). */
export const BUILD_ASSETS: Assets = {
  scripts: ["/static/platform.js"],
  styles: ["/static/platform.css"],
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderPage(page: Page, assets: Assets): string {
  const body = renderToString(<PageView page={page} />);
  // `<` is escaped so the JSON can't close the script tag early.
  const data = JSON.stringify(page).replaceAll("<", "\\u003c");
  const styles = assets.styles
    .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
    .join("\n  ");
  const scripts = assets.scripts
    .map((src) => `<script type="module" src="${escapeHtml(src)}"></script>`)
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle(page))}</title>
  ${styles}
</head>
<body>
<div id="root">${body}</div>
<script id="page-data" type="application/json">${data}</script>
${scripts}
</body>
</html>
`;
}

export function createHandler(files: Files, assets: Assets) {
  async function listing(slug: string) {
    const game = findGame(slug);
    return game && { ...game, playable: await files.hasIndex(slug) };
  }

  function html(page: Page, status = 200): Response {
    return new Response(renderPage(page, assets), {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

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
      return html({ name: "catalog", games: listings });
    }

    if (pathname.startsWith("/static/") || pathname.startsWith("/assets/")) {
      return files.serve(req);
    }

    const play = pathname.match(/^\/play\/([^/]+)\/?$/);
    if (play) {
      const game = await listing(play[1]);
      return game
        ? html({ name: "play", game })
        : html({ name: "notFound" }, 404);
    }

    const build = pathname.match(/^\/games\/([^/]+)(\/.*)?$/);
    if (build) {
      if (!findGame(build[1])) return html({ name: "notFound" }, 404);
      // Redirect to the trailing-slash form so a game's relative asset paths
      // resolve inside its folder.
      if (build[2] === undefined) {
        return Response.redirect(new URL(`${pathname}/`, url), 301);
      }
      return files.serve(req);
    }

    return html({ name: "notFound" }, 404);
  };
}
