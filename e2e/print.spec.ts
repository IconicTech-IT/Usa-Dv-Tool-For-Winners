import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type ArMessages from "../messages/ar.json";
import { SAMPLE_PLAN, STORAGE_KEY } from "./helpers";

/** The site's own words, read from the messages, so the test says what the page must say. */
function messages(locale: "ar" | "en"): typeof ArMessages {
  return JSON.parse(
    readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8"),
  ) as typeof ArMessages;
}
const ar = messages("ar");
const en = messages("en");

/** A plan whose family follows after four months, so the printed page shows both phases. */
const PLAN = {
  ...SAMPLE_PLAN,
  travel: { mode: "follow", followMonths: "4" },
  items: {
    ...SAMPLE_PLAN.items,
    temporaryStay: { raw: "200", currency: "usd" },
    securityDeposit: { raw: "1000", currency: "usd" },
    familyAbroadMonthly: { raw: "70", currency: "usd" },
  },
};

async function openForPrint(page: Page, path: string): Promise<void> {
  await page.addInitScript(([key, plan]) => window.localStorage.setItem(key, plan), [
    STORAGE_KEY,
    JSON.stringify(PLAN),
  ] as const);
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".print-sheet h1")).toHaveText(PLAN.name);
  await page.emulateMedia({ media: "print" });
}

test.describe("the printed plan, in the dark colour scheme", () => {
  test.use({ colorScheme: "dark" });

  test("the results page prints only the plan: light, right to left, with every part", async ({ page }) => {
    await openForPrint(page, "/ar/results");
    const sheet = page.locator(".print-sheet");

    // Only the sheet is on the page: no navigation, no buttons, no links, none of the screen content.
    await expect(sheet).toBeVisible();
    await expect(page.getByRole("button")).toHaveCount(0);
    await expect(page.getByRole("link")).toHaveCount(0);
    await expect(page.locator(".calc-page > h1")).toBeHidden();

    // Light and in the page's own direction, though the screen was dark.
    const look = await sheet.evaluate((el) => ({
      direction: getComputedStyle(el).direction,
      background: getComputedStyle(document.body).backgroundColor,
      ink: getComputedStyle(el.querySelector("h1") ?? el).color,
    }));
    expect(look).toEqual({ direction: "rtl", background: "rgb(255, 255, 255)", ink: "rgb(0, 0, 0)" });

    // The page is A4.
    const pageRule = await page.evaluate(() =>
      [...document.styleSheets]
        .flatMap((sheetOfStyles) => [...sheetOfStyles.cssRules])
        .filter((rule) => rule.constructor.name === "CSSPageRule")
        .map((rule) => rule.cssText),
    );
    expect(pageRule.join(" ")).toMatch(/size:\s*a4/i);

    // The content: name, date, household, how they travel, currency and the typed rate.
    await expect(sheet.locator("h1")).toHaveText(PLAN.name);
    await expect(sheet.locator(".print-head")).toContainText(`${ar.print.printedOn}: `);
    await expect(sheet.locator(".print-head p")).not.toHaveText(new RegExp(`${ar.print.printedOn}: $`));
    const facts = sheet.locator(".print-facts").first();
    await expect(facts).toContainText(ar.results.household);
    await expect(facts).toContainText(ar.results.travelFollow.replace("{months}", "٤"));
    await expect(facts).toContainText(PLAN.localCurrency);
    await expect(facts).toContainText(
      ar.print.rateValue.replace("{rate}", PLAN.rate).replace("{code}", PLAN.localCurrency),
    );

    // Each stage with its boxes and its total, with the phases of a family that follows later.
    await expect(sheet.locator("h2", { hasText: ar.print.stagesHeading })).toBeVisible();
    const stages = sheet.locator(".print-stage");
    await expect(stages.filter({ hasText: ar.calc.items.medicalExam })).toHaveCount(1);
    await expect(stages.filter({ hasText: ar.calc.timeline.firstMonthAlone.title })).toHaveCount(1);
    await expect(stages.filter({ hasText: ar.calc.timeline.aloneMonths.title })).toHaveCount(1);
    await expect(
      stages.filter({ hasText: ar.calc.timeline.familyArrival.title.replace("{months}", "٤") }),
    ).toHaveCount(1);
    await expect(sheet.locator(".print-sum").first()).toContainText(ar.common.stageTotal);

    // The timeline, the monthly costs and scenarios, the legal line and the address of the site.
    await expect(sheet.locator(".tl")).toBeVisible();
    await expect(sheet.locator("h2", { hasText: ar.print.runwayHeading })).toBeVisible();
    await expect(sheet.locator(".scen .sc")).toHaveCount(5);
    await expect(sheet.locator(".print-legal").first()).toHaveText(ar.footer.legal);
    await expect(sheet.locator(".print-legal").last()).toContainText("https://dv-compass.vercel.app/ar");
  });

  test("the same page is hidden on the screen", async ({ page }) => {
    await openForPrint(page, "/ar/results");
    await page.emulateMedia({ media: "screen" });
    await expect(page.locator(".print-sheet")).toBeHidden();
  });

  test("the plans page prints the open plan, and its button opens the print window", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { printed: number }).printed = 0;
      window.print = () => {
        (window as unknown as { printed: number }).printed += 1;
      };
    });
    await openForPrint(page, "/ar/plans");
    await expect(page.locator(".print-sheet")).toBeVisible();
    await expect(page.locator(".plan-list")).toBeHidden();
    await page.emulateMedia({ media: "screen" });
    await page.getByRole("button", { name: ar.print.button }).click();
    expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);
  });

  test("the English page prints left to right with its own words", async ({ page }) => {
    await openForPrint(page, "/en/results");
    const sheet = page.locator(".print-sheet");
    await expect(sheet).toBeVisible();
    expect(await sheet.evaluate((el) => getComputedStyle(el).direction)).toBe("ltr");
    await expect(sheet.locator(".print-facts").first()).toContainText(en.print.currency);
    await expect(sheet.locator(".print-legal").first()).toHaveText(en.footer.legal);
    await expect(sheet.locator(".print-legal").last()).toContainText("https://dv-compass.vercel.app/en");
  });
});
