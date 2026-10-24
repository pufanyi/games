// Nail House builds on its own into dist/, which the platform publishes at
// /games/nail-house/. `base: "./"` keeps every asset URL relative so the build
// also works when the folder is opened on its own.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: "dist", emptyOutDir: true },
});
