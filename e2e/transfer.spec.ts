import { expect, test, type Browser, type Page } from "@playwright/test";

import { seedPlan } from "./helpers";

/**
 * "Move to another device": a link with the plan after the "#" and a QR code, made on the page.
 * Opening the link only offers to add the plan; a broken link says so; nothing is sent anywhere.
 */

async function makeLink(page: Page): Promise<string> {
  await seedPlan(page);
  await page.goto("/ar/results");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "ابعت الخطة لجهاز تاني" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("#transfer-link")).toBeVisible();
  await expect(dialog.getByText("اللينك ده فيه أرقامك، ما تبعتهوش لحد.")).toBeVisible();
  await expect(dialog.locator("svg.qr")).toBeVisible();
  return dialog.locator("#transfer-link").inputValue();
}

async function otherDevice(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  return { context, page, requests };
}

test("the link carries the plan after the '#', and the other device is offered the plan", async ({
  page,
  browser,
}) => {
  const link = await makeLink(page);
  const origin = new URL(page.url()).origin;
  expect(link.startsWith(`${origin}/ar/plans#p=`)).toBe(true);
  expect(new URL(link).search).toBe("");

  const { context, page: other, requests } = await otherDevice(browser);
  await other.goto(link);
  const dialog = other.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { level: 3 }).or(dialog.getByText("تضيف الخطة دي لخططك؟")),
  ).toBeVisible();
  await expect(dialog).toContainText("خطة تجريبية");

  // The plan left the address bar at once, and nothing was added yet.
  expect(other.url()).not.toContain("#");
  await other.getByRole("button", { name: "إغلاق" }).click();
  await other.goto("/ar/plans");
  await expect(other.locator(".plan-row")).toHaveCount(1);

  // Opening it again and agreeing adds it next to the plan the device already has.
  await other.goto(link);
  await other.getByRole("button", { name: "ضيف الخطة" }).click();
  await expect(other.getByRole("dialog")).toContainText("الخطة اتضافت باسم «خطة تجريبية»");
  await other.goto("/ar/plans");
  await expect(other.locator(".plan-row")).toHaveCount(2);
  await expect(other.locator(".plan-row.on")).toContainText("خطة تجريبية");

  // Nothing about the plan was ever requested from the server.
  const payload = link.slice(link.indexOf("#p=") + 3, link.indexOf("#p=") + 40);
  expect(requests.filter((url) => url.includes(payload) || url.includes("#"))).toEqual([]);
  await context.close();
});

test("saying no adds nothing, and a broken link says it does not work", async ({ browser, page }) => {
  const link = await makeLink(page);
  const { context, page: other } = await otherDevice(browser);

  await other.goto(link);
  await other.getByRole("button", { name: "لأ، ماتضفهاش" }).click();
  await other.goto("/ar/plans");
  await expect(other.locator(".plan-row")).toHaveCount(1);

  await other.goto("/ar/plans#p=AAAA");
  await expect(other.getByRole("dialog")).toContainText("اللينك ده مش شغال");
  await context.close();
});
