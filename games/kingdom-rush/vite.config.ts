// Kingdom Rush builds on its own into dist/, which the platform publishes at
// /games/kingdom-rush/. `base: "./"` keeps every asset URL relative, so the
// build works at that path and when opened anywhere else.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5174 },
  // The stage, tower and enemy tables are a large share of the bundle; the
  // minified build is ~710 kB (about 170 kB gzipped) and loads in one piece.
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 800 },
});
