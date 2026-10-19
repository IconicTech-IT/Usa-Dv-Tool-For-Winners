import { expect, test, type Page } from "@playwright/test";

/** Opens a page and waits until it has loaded its scripts, so typing is not lost before the page is ready. */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/**
 * Named plans: several plans kept on the device, each with a name the person typed; the list to
 * open, rename, duplicate and delete them; the comparison that picks two by name; the plan name in
 * the saved file name.
 */
test("named plans: make, switch, rename, duplicate, delete, compare by name, save with the name", async ({
  page,
}) => {
  await open(page, "/ar/setup");
  await page.getByLabel("اسم الخطة").fill("تكساس - لوحدي");
  await page.getByLabel("اسم الخطة").blur();

  // The first plan has its name and is open.
  await open(page, "/ar/plans");
  await expect(page.locator(".plan-row.on")).toContainText("تكساس - لوحدي");

  // A second plan is made from the list and becomes the open one.
  await page.getByLabel("اسم الخطة").fill("نورث كارولينا - مع العيلة");
  await page.getByRole("button", { name: "اعمل خطة جديدة" }).click();
  await expect(page.locator(".plan-row")).toHaveCount(2);
  await expect(page.locator(".plan-row.on")).toContainText("نورث كارولينا - مع العيلة");

  // Each plan keeps its own numbers.
  await open(page, "/ar/fees");
  const firstBox = page.locator(".input input").first();
  await firstBox.fill("77");
  await open(page, "/ar/plans");
  await page.getByRole("button", { name: /افتح الخطة: تكساس/ }).click();
  await open(page, "/ar/fees");
  await expect(page.locator(".input input").first()).toHaveValue("");

  // Rename and duplicate.
  await open(page, "/ar/plans");
  await page.getByRole("button", { name: /غيّر الاسم: تكساس/ }).click();
  await page.getByRole("textbox", { name: "غيّر الاسم" }).fill("تكساس - الأساسية");
  await page.keyboard.press("Enter");
  await expect(page.locator(".plan-row").first()).toContainText("تكساس - الأساسية");
  await page.getByRole("button", { name: /اعمل نسخة منها: تكساس - الأساسية/ }).click();
  await expect(page.locator(".plan-row")).toHaveCount(3);
  await expect(page.locator(".plan-row.on")).toContainText("تكساس - الأساسية (2)");

  // Delete asks first; saying no keeps the plan, saying yes removes it.
  page.once("dialog", (dialog) => void dialog.dismiss());
  await page.getByRole("button", { name: /امسح الخطة: تكساس - الأساسية \(2\)/ }).click();
  await expect(page.locator(".plan-row")).toHaveCount(3);
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: /امسح الخطة: تكساس - الأساسية \(2\)/ }).click();
  await expect(page.locator(".plan-row")).toHaveCount(2);

  // The comparison picks two plans by name and shows the names as the column titles.
  await open(page, "/ar/compare");
  await page.getByLabel("الخطة أ").selectOption({ label: "تكساس - الأساسية" });
  await page.getByLabel("الخطة ب").selectOption({ label: "نورث كارولينا - مع العيلة" });
  const headers = page.locator("table.cmp th");
  await expect(headers.nth(1)).toHaveText("تكساس - الأساسية");
  await expect(headers.nth(2)).toHaveText("نورث كارولينا - مع العيلة");

  // The saved file carries the plan name.
  await open(page, "/ar/results");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "احفظ الخطة على جهازك (ملف)" }).click();
  expect((await download).suggestedFilename()).toMatch(/^dv-compass-.*تكساس.*\.json$/);
});

test("the old single plan of the first version is moved into the list", async ({ page }) => {
  await page.addInitScript(() => {
    if (window.localStorage.getItem("dv-compass:plans:v1") === null) {
      window.localStorage.setItem(
        "dv-compass:plan:v1",
        JSON.stringify({
          version: 1,
          uiMode: "detailed",
          household: { adults: 1, children: 0, childAges: [] },
          localCurrency: "EGP",
          rate: "47",
          items: {},
          quick: {},
          income: { raw: "", currency: "usd" },
          spouseIncome: { raw: "", currency: "usd" },
          savings: { raw: "", currency: "usd" },
          bufferMonths: "",
        }),
      );
    }
  });
  await open(page, "/en/plans");
  await expect(page.locator(".plan-row")).toHaveCount(1);
  await open(page, "/en/fees");
  await expect(page.locator(".rate .eq input")).toHaveValue("47");
});
