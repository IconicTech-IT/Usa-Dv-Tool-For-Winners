import type { Locator, Page } from "@playwright/test";

import { PAGE_PATHS } from "../lib/routes";

export const LOCALES = ["ar", "en"] as const;

/** Every public page, plus the offline page and two guide pages. */
export const ALL_PATHS: string[] = [...PAGE_PATHS, "/offline", "/guide/food", "/guide/passport"];

/** A small plan with typed amounts, so the pages that show totals are tested with numbers on them. */
export const SAMPLE_PLAN = {
  version: 1,
  name: "خطة تجريبية",
  uiMode: "detailed",
  household: { adults: 2, children: 1, childAges: ["7"] },
  localCurrency: "EGP",
  rate: "50",
  items: {
    passport: { raw: "40", currency: "usd" },
    medicalExam: { raw: "150", currency: "usd" },
    ticket: { raw: "600", currency: "usd" },
    rent: { raw: "1500", currency: "usd" },
  },
  quick: {},
  income: { raw: "", currency: "usd" },
  spouseIncome: { raw: "", currency: "usd" },
  savings: { raw: "20000", currency: "usd" },
  bufferMonths: "3",
} as const;

export const STORAGE_KEY = "dv-compass:plan:v1";

/** Puts the sample plan in the browser's storage before any page script runs. */
export async function seedPlan(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, plan]) => {
      window.localStorage.setItem(key, plan);
    },
    [STORAGE_KEY, JSON.stringify(SAMPLE_PLAN)] as const,
  );
}

/** Presses Tab until the element has focus; fails if it cannot be reached (a keyboard trap or a skipped control). */
export async function tabTo(page: Page, target: Locator, maxPresses = 80): Promise<void> {
  for (let i = 0; i < maxPresses; i += 1) {
    const isFocused = await target.evaluate((el) => el === document.activeElement).catch(() => false);
    if (isFocused) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Could not reach ${String(target)} with the Tab key in ${maxPresses} presses`);
}
