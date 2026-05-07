import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  /** Relative asset paths required for Capacitor APK (loads from app WebView). Dev keeps `/`. */
  base: mode === "production" ? "./" : "/",
  plugins: [react(), tailwindcss()],
  /** Lets you open the dev server from your phone on the same Wi‑Fi (`pnpm dev:lan`). */
  server: {
    host: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
}));
