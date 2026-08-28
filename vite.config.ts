import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The native shell loads this dev server; the port is pinned because
// desktop/tauri.conf.json hardcodes it as devUrl.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/desktop/**"] },
  },
  build: {
    target: "safari15",
    outDir: "dist",
    emptyOutDir: true,
  },
});
