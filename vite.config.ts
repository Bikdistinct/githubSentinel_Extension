import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],

  build: {
    outDir:   "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Popup (React app)
        popup:      resolve(__dirname, "index.html"),
        // Content script (runs in GitHub tab)
        content:    resolve(__dirname, "src/content.ts"),
        // Background service worker
        background: resolve(__dirname, "src/background.ts"),
      },
      output: {
        // Keep output filenames predictable for manifest.json references
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },

  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
});
