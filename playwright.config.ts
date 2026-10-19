import { defineConfig } from "@playwright/test";

/**
 * Browser tests (E-05, G-12, Q-20). They run against the PRODUCTION build, because the service
 * worker is registered only there: `npm run build` first, then `npm run test:e2e`.
 *
 * The browser is whatever Chromium-based browser is installed: set E2E_BROWSER_PATH to its
 * executable (for example Brave); without it the tests use the installed Google Chrome.
 */
const PORT = 3101;
const browserPath = process.env["E2E_BROWSER_PATH"];

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  // Three browsers at a time: more makes the browser crash on a small machine.
  workers: 3,
  forbidOnly: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...(browserPath ? { launchOptions: { executablePath: browserPath } } : { channel: "chrome" }),
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
