import { expect, test } from "@playwright/test";

import { ALL_PATHS, LOCALES, seedPlan } from "./helpers";

/** No page may need horizontal scrolling on a small phone, in either language. */
for (const width of [320, 375, 768]) {
  test.describe(`width ${width}`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const locale of LOCALES) {
      test(`${locale}: no sideways scrolling on any page`, async ({ page }) => {
        await seedPlan(page);
        const wide: string[] = [];
        for (const path of ALL_PATHS) {
          await page.goto(`/${locale}${path}`);
          await page.waitForLoadState("networkidle");
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          if (overflow > 0) wide.push(`${path} (+${overflow}px)`);
        }
        expect(wide, wide.join("\n")).toEqual([]);
      });
    }
  });
}
