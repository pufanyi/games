// Deno entry point: serves the production build in `dist/` (run
// `deno task build` first). For development, use `deno task dev` instead.
import { serveDir } from "@std/http/file-server";
import { BUILD_ASSETS, createHandler } from "./platform/app.tsx";

const ROOT = import.meta.dirname;
if (!ROOT) throw new Error("main.ts must be run from a local file");
const DIST = `${ROOT}/dist`;

async function hasIndex(slug: string): Promise<boolean> {
  try {
    return (await Deno.stat(`${DIST}/games/${slug}/index.html`)).isFile;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

// Everything in dist/ is public, so it can be one file root.
function serve(req: Request): Promise<Response> {
  return serveDir(req, { fsRoot: DIST, quiet: true });
}

export const handler = createHandler({ hasIndex, serve }, BUILD_ASSETS);

if (import.meta.main) {
  Deno.serve(handler);
}
