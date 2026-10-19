import { expect, test } from "@playwright/test";

/**
 * G-11: Core Web Vitals on a phone (the goal is the green range): the biggest thing on the page
 * appears within 2.5 seconds (LCP) and the page does not jump while it loads (CLS 0.1 or less).
 * The page is loaded on a slow phone: the processor four times slower and a "fast 4G" network.
 * The first load has an empty cache, as a new visitor's has.
 */
const LCP_LIMIT_MS = 2_500;
const CLS_LIMIT = 0.1;
const PAGES = [
  "/ar",
  "/ar/setup",
  "/ar/fees",
  "/ar/moving",
  "/ar/runway",
  "/ar/quick",
  "/ar/results",
  "/ar/compare",
  "/ar/plans",
  "/ar/charge",
  "/ar/english",
  "/ar/scam",
  "/ar/guide/passport",
  "/en",
  "/en/fees",
  "/en/results",
];

interface Vitals {
  lcp: number;
  cls: number;
}

test.use({ viewport: { width: 375, height: 812 } });

for (const path of PAGES) {
  test(`${path} is fast and steady on a slow phone`, async ({ page, context }) => {
    await page.addInitScript(() => {
      const vitals = { lcp: 0, cls: 0 };
      Object.assign(globalThis, { __vitals: vitals });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) vitals.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!shift.hadRecentInput) vitals.cls += shift.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    const client = await context.newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await client.send("Network.enable");
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });

    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_500);
    const vitals = await page.evaluate(() => (globalThis as unknown as { __vitals: Vitals }).__vitals);

    test
      .info()
      .annotations.push({
        type: "vitals",
        description: `${path}: LCP ${Math.round(vitals.lcp)} ms, CLS ${vitals.cls.toFixed(3)}`,
      });
    expect(vitals.lcp, `LCP of ${path}`).toBeGreaterThan(0);
    expect(vitals.lcp, `LCP of ${path} in ms`).toBeLessThanOrEqual(LCP_LIMIT_MS);
    expect(vitals.cls, `CLS of ${path}`).toBeLessThanOrEqual(CLS_LIMIT);
  });
}
