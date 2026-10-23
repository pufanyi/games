// Builds the platform's browser assets into dist/static/ and dist/assets/.
// Games build separately (scripts/build_games.ts). The page HTML itself is
// rendered by platform/app.tsx, so Vite doesn't serve or emit any HTML.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { platformDevServer } from "./platform/dev.ts";

export default defineConfig({
  appType: "custom",
  publicDir: false,
  plugins: [react(), platformDevServer()],
  server: {
    port: 8000,
    // Game builds and the platform build change under these; not sources.
    watch: { ignored: ["**/dist/**", "**/.wrangler/**"] },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        platform: "platform/client.tsx",
        "platform-styles": "platform/styles.css",
      },
      output: {
        // Fixed names for the entry points, which platform/app.tsx links to
        // (BUILD_ASSETS); hashed names for everything they import.
        entryFileNames: "static/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: (asset) =>
          asset.names.includes("platform-styles.css")
            ? "static/platform.css"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
});
