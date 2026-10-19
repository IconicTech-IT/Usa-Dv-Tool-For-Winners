import { expect, test } from "@playwright/test";

import { LOCALES } from "./helpers";

/**
 * Q-20: offline behaviour in a real browser with the network cut. A page opened once must keep
 * working, what the person typed must survive a reload offline, and a page that was never saved
 * must show the offline page instead of a browser error.
 */
test.describe.configure({ mode: "serial" });

for (const locale of LOCALES) {
  test(`${locale}: the site works without internet after the first visit`, async ({ page, context }) => {
    await page.goto(`/${locale}`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect
      .poll(
        () => page.evaluate(async (path) => (await caches.match(path)) !== undefined, `/${locale}/fees`),
        {
          timeout: 45_000,
        },
      )
      .toBe(true);

    await context.setOffline(true);

    // A saved calculator opens, takes a number, and keeps it after a reload, all offline.
    await page.goto(`/${locale}/fees`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const firstBox = page.locator(".input input").first();
    await firstBox.fill("123");
    await page.reload();
    await expect(page.locator(".input input").first()).toHaveValue("123");

    // The results page opens offline and shows the number.
    await page.goto(`/${locale}/results`);
    // 123 typed, plus the official registration fee a new plan starts with.
    await expect(page.locator("table")).toContainText(/124|١٢٤/);

    // A page that was never saved (a guide) shows the offline page, which proves the network is really cut.
    await page.goto(`/${locale}/guide/rent`);
    await expect(
      page.getByRole("link", { name: locale === "ar" ? "ارجع للرئيسية" : "Back to the home page" }),
    ).toBeVisible();

    await context.setOffline(false);
  });
}
