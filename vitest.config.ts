import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // The project keeps jsx as "preserve" for Next.js; the test runner needs it compiled.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // E-10: a committed `.only` must fail the run, not silently skip the other tests.
    allowOnly: false,
  },
});
