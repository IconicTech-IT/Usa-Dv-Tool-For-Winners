/**
 * Makes the share cards (public/og-ar.png and public/og-en.png) by photographing the card page
 * of the production build. Run after `npm run build`:
 *
 *   E2E_BROWSER_PATH=<path to a Chromium-based browser> node scripts/make-og.ts
 *
 * The card page exists only while OG_CARD=1, which this script sets for its own server.
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const PORT = 3102;
const BASE = `http://localhost:${PORT}`;
const LOCALES = ["ar", "en"];
const browserPath = process.env["E2E_BROWSER_PATH"];

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/ar`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("The production server did not start. Run npm run build first.");
}

const server = spawn(`npx next start -p ${PORT}`, {
  env: { ...process.env, OG_CARD: "1" },
  shell: true,
  stdio: "ignore",
});

try {
  await waitForServer();
  const browser = await chromium.launch(
    browserPath ? { executablePath: browserPath } : { channel: "chrome" },
  );
  await mkdir("public", { recursive: true });
  for (const locale of LOCALES) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: "light" });
    await page.goto(`${BASE}/${locale}/og-card`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator("#og-card").screenshot({ path: `public/og-${locale}.png` });
    await page.close();
  }
  await browser.close();
  console.log("Wrote public/og-ar.png and public/og-en.png");
} finally {
  // `next start` runs under a shell; stop the whole tree.
  spawn(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore", shell: true });
}
