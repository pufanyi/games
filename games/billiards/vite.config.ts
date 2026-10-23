// Billiards builds on its own into dist/, which the platform publishes at
// /games/billiards/. `base: "./"` keeps every asset URL relative, so the build
// works at that path and when opened anywhere else.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5174 },
  build: { outDir: "dist", emptyOutDir: true },
});
