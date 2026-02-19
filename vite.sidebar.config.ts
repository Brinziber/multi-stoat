import { resolve } from "node:path";
import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  root: resolve(__dirname, "src/sidebar"),
  build: {
    outDir: resolve(__dirname, ".vite/renderer/sidebar"),
    rollupOptions: {
      input: resolve(__dirname, "src/sidebar/index.html"),
    },
  },
});
