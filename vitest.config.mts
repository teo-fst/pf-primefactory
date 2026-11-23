import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // tests/integration usa il database reale e si attiva solo con E2E_WITH_SUPABASE=1 (altrimenti è saltato)
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
  },
});
