// Publishes every game in games/ to dist/games/<slug>/, after `vite build` has
// written the platform's assets. Games with a build task are built first (see
// platform/game_builds.ts); folders without an index.html yet are skipped.
import { cpSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { hasBuildTask, publishedDir } from "../platform/game_builds.ts";
import { findGame } from "../platform/games.ts";

// Never published from a game folder that ships as-is.
const EXCLUDED = new Set(["node_modules", "DESIGN.md"]);

for (const entry of readdirSync("games", { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const slug = entry.name;
  const dir = join("games", slug);
  if (!findGame(slug)) {
    console.warn(`games/${slug}: not in platform/games.ts, so not routed`);
  }

  if (hasBuildTask(dir)) {
    console.log(`games/${slug}: deno task build`);
    const { success } = new Deno.Command(Deno.execPath(), {
      args: ["task", "build"],
      cwd: dir,
      stdout: "inherit",
      stderr: "inherit",
    }).outputSync();
    if (!success) throw new Error(`games/${slug}: build failed`);
  }

  const from = publishedDir(dir);
  if (!from) {
    console.log(`games/${slug}: no index.html yet, skipped`);
    continue;
  }
  const builtSeparately = from !== dir;
  cpSync(from, join("dist", "games", slug), {
    recursive: true,
    filter: (src) =>
      builtSeparately ||
      !(EXCLUDED.has(basename(src)) || basename(src).startsWith(".")),
  });
  console.log(`games/${slug}: published from ${from}`);
}
