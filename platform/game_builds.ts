// Where each game's static build comes from. Shared by the build script
// (scripts/build_games.ts) and the dev server (platform/dev.ts), so both serve
// the same files. Uses node: APIs because the dev server runs inside Vite.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Whether a game builds itself: a `build` task in its `deno.json` or a `build`
 * script in its `package.json` (both run with `deno task build`). Its output
 * must go to `<game>/dist/`.
 */
export function hasBuildTask(gameDir: string): boolean {
  const deno = readJson(join(gameDir, "deno.json"))?.tasks;
  const npm = readJson(join(gameDir, "package.json"))?.scripts;
  return [deno, npm].some(
    (scripts) =>
      typeof scripts === "object" && scripts !== null &&
      "build" in scripts,
  );
}

/**
 * The folder a game is published from: `<game>/dist/` for games with a build
 * step, otherwise the game folder itself. Null while there's no `index.html`.
 */
export function publishedDir(gameDir: string): string | null {
  const dir = hasBuildTask(gameDir) ? join(gameDir, "dist") : gameDir;
  return existsSync(join(dir, "index.html")) ? dir : null;
}
