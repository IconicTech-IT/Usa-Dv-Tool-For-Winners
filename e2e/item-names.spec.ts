import { expect, test } from "@playwright/test";

test("the home supplies box says what it is and where the food is", async ({ page }) => {
  await page.goto("/ar/moving");
  await page.waitForLoadState("networkidle");
  const box = page.locator(".field", { has: page.getByText("مستلزمات البيت أول ما توصل", { exact: true }) });
  await expect(box).toBeVisible();
  await expect(box.locator(".includes")).toContainText("يشمل: أدوات مطبخ، مفارش وبطاطين، حاجات تنضيف وحمام");
  await expect(box.locator(".includes")).toContainText("الأكل مش هنا، ده في المصاريف الشهرية");
  // The line is part of the box's description for a screen reader.
  const describedBy = await box.locator("input").getAttribute("aria-describedby");
  expect(describedBy).toContain("-includes");
  await expect(page.getByText("أساسيات البيت")).toHaveCount(0);

  await page.goto("/ar/runway");
  await page.waitForLoadState("networkidle");
  const food = page.locator(".field", { has: page.getByText("الأكل والبقالة (شهريًا)", { exact: true }) });
  await expect(food.locator(".includes")).toContainText("يشمل: بقالة وسوبر ماركت وأكل البيت");
});

test("the English page names the same boxes plainly", async ({ page }) => {
  await page.goto("/en/moving");
  await page.waitForLoadState("networkidle");
  const box = page.locator(".field", { has: page.getByText("Home supplies on arrival", { exact: true }) });
  await expect(box.locator(".includes")).toContainText("Includes: Kitchen items, bed linen and blankets");
  await expect(box.locator(".includes")).toContainText("Food is not here");

  await page.goto("/en/runway");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Food and groceries (monthly)", { exact: true })).toBeVisible();
  await expect(page.getByText("Other monthly costs", { exact: true })).toBeVisible();
  await expect(page.getByText("Other", { exact: true })).toHaveCount(0);
});

test("every box that has an 'Includes' line shows it on the fees page, in one line of text", async ({
  page,
}) => {
  await page.goto("/ar/fees");
  await page.waitForLoadState("networkidle");
  const lines = page.locator(".field .includes");
  expect(await lines.count()).toBeGreaterThan(5);
  for (const text of await lines.allInnerTexts()) {
    expect(text.startsWith("يشمل:")).toBe(true);
    expect(text).not.toMatch(/[$]|[0-9٠-٩]\s?(USD|EGP|جنيه|دولار)/);
  }
});
