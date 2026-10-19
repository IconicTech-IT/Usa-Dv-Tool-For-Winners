import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { ALL_PATHS, LOCALES, seedPlan } from "./helpers";

/**
 * G-12: WCAG 2.2 AA with axe on every page, in both languages and both colour schemes.
 * The target-size rule (24 by 24 pixels) is off in axe by default, so it is turned on here.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const scheme of ["light", "dark"] as const) {
  for (const locale of LOCALES) {
    test.describe(`${locale} ${scheme}`, () => {
      test.use({ colorScheme: scheme, viewport: { width: 375, height: 812 } });

      for (const path of ALL_PATHS) {
        test(`${path || "/"} has no axe violations`, async ({ page }) => {
          await seedPlan(page);
          await page.goto(`/${locale}${path}`);
          await page.waitForLoadState("networkidle");
          const results = await new AxeBuilder({ page })
            .withTags(TAGS)
            .options({ rules: { "target-size": { enabled: true } } })
            .analyze();
          const summary = results.violations.map(
            (v) =>
              `${v.id} (${v.impact ?? "n/a"}): ${v.nodes
                .slice(0, 3)
                .map((n) => n.target.join(" "))
                .join(" | ")} (${v.nodes.length} in all)`,
          );
          expect(summary, summary.join("\n")).toEqual([]);
        });
      }
    });
  }
}
