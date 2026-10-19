import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { SAMPLE_PLAN, STORAGE_KEY } from "./helpers";

/** Opens a page and waits until it has loaded its scripts, so typing is not lost before the page is ready. */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** The box with this label, by the text of its label. */
function box(scope: Page | Locator, label: string) {
  const page = "page" in scope && typeof scope.page === "function" ? scope.page() : (scope as Page);
  return scope.locator(".field", { has: page.getByText(label, { exact: true }) });
}

const FOLLOW = "Me first, the family follows after … months";
const MONTHS = "How many months until the family joins you?";

test("the principal travels first and the family follows: setup, moving, monthly costs and results", async ({
  page,
}) => {
  // Setup: the question appears only when there is a family.
  await open(page, "/en/setup");
  await page.getByRole("button", { name: "Alone" }).click();
  await expect(page.getByText("How will you travel?")).toHaveCount(0);
  await page.getByRole("button", { name: "With family" }).click();
  await expect(page.getByRole("button", { name: "All together" })).toHaveAttribute("aria-pressed", "true");

  // The family follows after some months: the rule is shown, and a long wait warns without blocking.
  await page.getByRole("button", { name: FOLLOW }).click();
  await expect(page.getByText(/The principal applicant must enter the United States before/)).toBeVisible();
  await expect(page.getByText("Type the number of months so we can work")).toBeVisible();
  const warning = page.getByText(/A visa usually expires about six months after the medical exam/);
  await page.getByLabel(MONTHS).fill("3");
  await expect(warning).toHaveCount(0);
  await page.getByLabel(MONTHS).fill("4");
  await expect(warning).toBeVisible();
  await page.getByLabel(MONTHS).fill("8");
  await expect(warning).toBeVisible();
  await page.getByLabel(MONTHS).fill("4");

  // The moving calculator has the principal's arrival and the family's arrival instead of the five groups.
  await open(page, "/en/moving");
  await expect(page.getByRole("heading", { name: /When you arrive alone/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /When the family arrives/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /First housing/ })).toHaveCount(0);
  const ticket = box(page, "Flight ticket: adult (12 or older)");
  await ticket.locator("input").fill("600");
  await expect(ticket).toContainText("× 2 people = $");
  await expect(ticket).toContainText("of it when the family arrives");
  await box(page, "Rental security deposit (refundable)").locator("input").fill("1000");

  // The monthly costs: the family's costs back home appear, and there are two monthly totals.
  await open(page, "/en/runway");
  const alone = page.locator("section.card", {
    has: page.getByRole("heading", { name: "Monthly, while you are alone" }),
  });
  const withFamily = page.locator("section.card", {
    has: page.getByRole("heading", { name: "Monthly, with the family" }),
  });
  await expect(alone).toBeVisible();
  await expect(withFamily).toBeVisible();
  // Each card is typed on its own: a room for one while alone, the family's flat later.
  await box(alone, "Rent").locator("input").fill("400");
  await box(alone, "Food and groceries (monthly)").locator("input").fill("100");
  await box(alone, "Your family's monthly costs back home until they join you").locator("input").fill("70");
  await box(withFamily, "Rent").locator("input").fill("1000");
  await expect(alone.locator(".subtot")).toContainText("Monthly costs while you are alone");
  await expect(withFamily.locator(".subtot")).toContainText("Monthly costs once the family arrives");
  // The family's flat is not counted in the months alone: 400 + 100 + 70, not 1,570.
  await expect(alone.locator(".subtot")).toContainText("$ 570");
  await expect(withFamily.locator(".subtot")).toContainText("$ 1,000");
  // The family's card has no box for the family's costs back home, and the months alone have none for children.
  await expect(withFamily.getByText("Your family's monthly costs back home until they join you")).toHaveCount(
    0,
  );
  await expect(alone.getByText("Childcare", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Until the family arrives (after 4 months)")).toBeVisible();

  // The results page says how the household travels and shows the stages of both phases.
  await open(page, "/en/results");
  await expect(page.locator("main")).toContainText("Family after 4 months");
  await expect(page.locator(".tl:visible")).toContainText("When you arrive alone");
  await expect(page.locator(".tl:visible")).toContainText("When the family arrives (after 4 months)");
  await expect(page.locator(".tl:visible")).toContainText("Months until the family arrives");

  // Back to all together: the family's costs back home and the extra stages go away; the values are kept.
  await open(page, "/en/setup");
  await page.getByRole("button", { name: "All together" }).click();
  await open(page, "/en/runway");
  await expect(page.getByText("Your family's monthly costs back home until they join you")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Monthly, while you are alone" })).toHaveCount(0);
  await expect(page.getByText(/Until the family arrives/)).toHaveCount(0);
  await open(page, "/en/results");
  await expect(page.locator(".tl:visible")).not.toContainText("When the family arrives");
  await open(page, "/en/setup");
  await page.getByRole("button", { name: FOLLOW }).click();
  await expect(page.getByLabel(MONTHS)).toHaveValue("4");
  // What was typed for the months alone is still there.
  await open(page, "/en/runway");
  await expect(box(alone, "Rent").locator("input")).toHaveValue("400");
});

test("quick mode says it counts the family as travelling together, only when the family follows later", async ({
  page,
}) => {
  await open(page, "/en/setup");
  await page.getByRole("button", { name: "With family" }).click();
  await open(page, "/en/quick");
  const note = page.getByText("Quick mode counts the family as travelling together.");
  await expect(note).toHaveCount(0);

  await open(page, "/en/setup");
  await page.getByRole("button", { name: FOLLOW }).click();
  await page.getByLabel(MONTHS).fill("4");
  await open(page, "/en/quick");
  await expect(note).toBeVisible();

  await open(page, "/ar/quick");
  await expect(page.getByText("الوضع السريع بيحسب إن الأسرة مسافرة مع بعض.")).toBeVisible();
});

test("the Arabic page asks the question and keeps the plan after a reload", async ({ page }) => {
  await open(page, "/ar/setup");
  await page.getByRole("button", { name: "مع العيلة" }).click();
  await expect(page.getByText("هتسافروا إزاي؟")).toBeVisible();
  await page.getByRole("button", { name: "أنا الأول والأسرة تحصلني بعد … شهر" }).click();
  await page.getByLabel("الأسرة تحصلني بعد كام شهر؟").fill("3");

  await open(page, "/ar/results");
  await expect(page.locator("main")).toContainText("الأسرة بعد ٣ شهر");
  await expect(page.locator(".tl:visible")).toContainText("لما توصل لوحدك");
});

/** The pages that change when the family follows later, with a long wait so the setup page shows its warning. */
const FOLLOW_PLAN = {
  ...SAMPLE_PLAN,
  travel: { mode: "follow", followMonths: "8" },
  items: {
    ...SAMPLE_PLAN.items,
    securityDeposit: { raw: "1000", currency: "usd" },
    familyAbroadMonthly: { raw: "70", currency: "usd" },
  },
};
const FOLLOW_PATHS = ["/setup", "/moving", "/runway", "/results", "/compare"];
/** Text that proves the page is showing the follow-later plan, so the scan below is not of the usual page. */
const MARKERS: Record<string, Record<"ar" | "en", string>> = {
  "/setup": { ar: "هتسافروا إزاي؟", en: "How will you travel?" },
  "/moving": { ar: "لما الأسرة توصل", en: "When the family arrives" },
  "/runway": { ar: "شهريًا وانت لوحدك", en: "Monthly, while you are alone" },
  "/results": { ar: "الأسرة بعد ٨ شهر", en: "Family after 8 months" },
};
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const scheme of ["light", "dark"] as const) {
  for (const locale of ["ar", "en"] as const) {
    test.describe(`follow mode ${locale} ${scheme}`, () => {
      test.use({ colorScheme: scheme, viewport: { width: 375, height: 812 } });

      for (const path of FOLLOW_PATHS) {
        test(`${path} has no axe violations and no sideways scrolling`, async ({ page }) => {
          await page.addInitScript(([key, plan]) => window.localStorage.setItem(key, plan), [
            STORAGE_KEY,
            JSON.stringify(FOLLOW_PLAN),
          ] as const);
          await open(page, `/${locale}${path}`);
          const marker = MARKERS[path]?.[locale];
          if (marker !== undefined) await expect(page.locator("main")).toContainText(marker);
          const results = await new AxeBuilder({ page })
            .withTags(AXE_TAGS)
            .options({ rules: { "target-size": { enabled: true } } })
            .analyze();
          const summary = results.violations.map(
            (v) => `${v.id} (${v.impact ?? "n/a"}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
          );
          expect(summary, summary.join("\n")).toEqual([]);
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(overflow).toBeLessThanOrEqual(0);
        });
      }
    });
  }
}
