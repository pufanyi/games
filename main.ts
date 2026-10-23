import { serveDir } from "@std/http/file-server";
import { createHandler } from "./app.ts";

const ROOT = import.meta.dirname;
if (!ROOT) throw new Error("main.ts must be run from a local file");
const GAMES_DIR = `${ROOT}/games`;
const STATIC_DIR = `${ROOT}/static`;

async function hasIndex(slug: string): Promise<boolean> {
  try {
    return (await Deno.stat(`${GAMES_DIR}/${slug}/index.html`)).isFile;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

// Each folder gets its own fsRoot so a path can't climb out into the repo.
function serve(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  return pathname.startsWith("/static/")
    ? serveDir(req, { fsRoot: STATIC_DIR, urlRoot: "static", quiet: true })
    : serveDir(req, { fsRoot: GAMES_DIR, urlRoot: "games", quiet: true });
}

export const handler = createHandler({ hasIndex, serve });

if (import.meta.main) {
  Deno.serve(handler);
}
