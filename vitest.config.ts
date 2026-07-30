import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Route/server modules import the "server-only" poison pill, which
      // throws under vitest; stub it so API tests can import routes.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.js"),
    },
  },
});
