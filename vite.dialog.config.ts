import { resolve } from "node:path";
import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  root: resolve(__dirname, "src/dialogs"),
  build: {
    outDir: resolve(__dirname, ".vite/renderer/instance_manager"),
    rollupOptions: {
      input: resolve(__dirname, "src/dialogs/instance-manager.html"),
    },
  },
});
