import { expect, test, type Page } from "@playwright/test";

/** Opens a page and waits until it has loaded its scripts, so typing is not lost before the page is ready. */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** The box with this label, by the text of its label. */
function box(page: Page, label: string) {
  return page.locator(".field", { has: page.getByText(label, { exact: true }) });
}

test("a person alone does not see the family items, and a family does, with its value kept", async ({
  page,
}) => {
  await open(page, "/en/setup");
  await page.getByRole("button", { name: "Alone" }).click();

  await open(page, "/en/fees");
  await expect(box(page, "Medical exam: adults and anyone 15 or older")).toBeVisible();
  await expect(page.getByText("Passports for the rest of the family")).toHaveCount(0);

  // Add a spouse and type an amount: the box shows and counts it once.
  await open(page, "/en/setup");
  await page.getByRole("button", { name: "With family" }).click();
  await open(page, "/en/fees");
  const family = box(page, "Passports for the rest of the family");
  await expect(family).toBeVisible();
  await family.locator("input").fill("4000");
  await expect(family).toContainText("× 1 person = $");

  // Back to alone: the box goes away and its 4000 is no longer in the total.
  await open(page, "/en/setup");
  await page.getByRole("button", { name: "Alone" }).click();
  await open(page, "/en/fees");
  await expect(page.getByText("Passports for the rest of the family")).toHaveCount(0);
  await open(page, "/en/results");
  await expect(page.locator("main")).not.toContainText("4,000");

  // With family again the box is back, with the value typed before.
  await open(page, "/en/setup");
  await page.getByRole("button", { name: "With family" }).click();
  await open(page, "/en/fees");
  await expect(box(page, "Passports for the rest of the family").locator("input")).toHaveValue("4000");
});

test("a per-person box shows what its amount is multiplied by and the line total", async ({ page }) => {
  await open(page, "/en/setup");
  await page.getByRole("button", { name: "With family" }).click();
  await open(page, "/en/fees");

  const medical = box(page, "Medical exam: adults and anyone 15 or older");
  await expect(medical).not.toContainText("×");
  await medical.locator("input").fill("100");
  await expect(medical).toContainText("× 2 people = $");

  // A whole-household box carries no multiplier line.
  const translation = box(page, "Translation and certification");
  await translation.locator("input").fill("50");
  await expect(translation).not.toContainText("×");
});

test("the Arabic page says the same in Arabic", async ({ page }) => {
  await open(page, "/ar/setup");
  await page.getByRole("button", { name: "مع العيلة" }).click();
  await open(page, "/ar/fees");

  await expect(page.getByText("رسوم المقابلة (رسوم الـDV)", { exact: true })).toBeVisible();
  const medical = box(page, "الكشف الطبي: للكبار وأي حد 15 سنة أو أكبر");
  await medical.locator("input").fill("100");
  await expect(medical).toContainText("× ٢ فردين = $");
});
