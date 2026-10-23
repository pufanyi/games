// Vite dev-server plugin: runs platform routes through the same createHandler
// as production, loaded with ssrLoadModule so edits reload without a restart.
// Vite itself serves the platform's source modules (with hot reload); games are
// served from their published folders (platform/game_builds.ts).
import { readFileSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import type { Assets, Files } from "./app.tsx";
import { publishedDir } from "./game_builds.ts";

/** In dev, Vite serves the source files directly. */
const DEV_ASSETS: Assets = {
  scripts: ["/platform/client.tsx"],
  styles: ["/platform/styles.css"],
};

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function devFiles(root: string): Files {
  return {
    hasIndex: (slug) =>
      Promise.resolve(publishedDir(join(root, "games", slug)) !== null),
    serve(req) {
      // Only game files reach here in dev: /games/<slug>/<path>.
      const match = new URL(req.url).pathname.match(/^\/games\/([^/]+)\/(.*)$/);
      const dir = match && publishedDir(join(root, "games", match[1]));
      if (!match || !dir) return Promise.resolve(notFound());
      const rest = decodeURIComponent(match[2]) || "index.html";
      const file = normalize(join(dir, rest));
      if (!file.startsWith(normalize(dir))) return Promise.resolve(notFound());
      try {
        const path = statSync(file).isDirectory()
          ? join(file, "index.html")
          : file;
        const type = CONTENT_TYPES[extname(path)] ?? "application/octet-stream";
        return Promise.resolve(
          new Response(readFileSync(path), {
            headers: { "content-type": type },
          }),
        );
      } catch {
        return Promise.resolve(notFound());
      }
    },
  };
}

function notFound() {
  return new Response("Not found", { status: 404 });
}

/** Paths the platform routes; everything else is left to Vite. */
function isPlatformRoute(pathname: string) {
  return pathname === "/" || /^\/(play|games)(\/|$)/.test(pathname);
}

async function send(
  server: ViteDevServer,
  url: string,
  response: Response,
  res: ServerResponse,
) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const isPlatformPage = !url.startsWith("/games/") &&
    response.headers.get("content-type")?.startsWith("text/html");
  if (isPlatformPage) {
    // Injects Vite's client and React Fast Refresh into platform pages.
    res.end(await server.transformIndexHtml(url, await response.text()));
  } else {
    res.end(new Uint8Array(await response.arrayBuffer()));
  }
}

export function platformDevServer(): Plugin {
  return {
    name: "platform-dev-server",
    configureServer(server) {
      const files = devFiles(server.config.root);
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next) => {
          const url = req.url ?? "/";
          if (req.method !== "GET" || !isPlatformRoute(url.split("?")[0])) {
            return next();
          }
          try {
            const app = (await server.ssrLoadModule(
              "/platform/app.tsx",
            )) as typeof import("./app.tsx");
            const handler = app.createHandler(files, DEV_ASSETS);
            const response = await handler(
              new Request(new URL(url, `http://${req.headers.host}`)),
            );
            await send(server, url, response, res);
          } catch (error) {
            server.ssrFixStacktrace(error as Error);
            next(error);
          }
        },
      );
    },
  };
}
