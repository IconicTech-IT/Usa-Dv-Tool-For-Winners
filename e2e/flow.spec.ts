import { expect, test } from "@playwright/test";

import { tabTo } from "./helpers";

/**
 * G-12 and E-05: the main flow with the keyboard only (no mouse), and a visible focus ring on the
 * controls it passes through. axe covers little of WCAG 2.2, so this walk is part of the gate.
 */
test("the setup and the fees calculator can be done with the keyboard alone", async ({ page }) => {
  await page.goto("/ar/setup");

  // Family, with the Enter key.
  await tabTo(page, page.getByRole("button", { name: "مع العيلة" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "مع العيلة" })).toHaveAttribute("aria-pressed", "true");

  // On to the fees page with the Tab and Enter keys.
  await tabTo(page, page.getByRole("link", { name: /التالي/ }));
  await page.keyboard.press("Enter");
  await page.waitForURL("**/ar/fees");

  // The first box takes a number, and shows a focus ring while it has focus.
  const firstBox = page.locator(".input input").first();
  await tabTo(page, firstBox);
  const ring = await firstBox.evaluate((el) => getComputedStyle(el.closest(".input") ?? el).boxShadow);
  expect(ring).not.toBe("none");
  await page.keyboard.type("250");
  await expect(firstBox).toHaveValue("250");

  // A guide button is reachable and its focus is visible.
  const guide = page.getByRole("link", { name: "إزاي أعرف السعر؟" }).first();
  await tabTo(page, guide);
  const outline = await guide.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
});

test("the currency list opens, traps focus, closes with Escape and gives focus back", async ({ page }) => {
  await page.goto("/ar/fees");
  const opener = page.locator("button.pick");
  await opener.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.type("SAR");
  await expect(dialog.getByRole("button", { name: /SAR/ })).toBeVisible();

  // Tab never leaves the dialog.
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("the typed amounts add up on the results page", async ({ page }) => {
  await page.goto("/en/fees");
  await page.locator(".input input").first().fill("40");
  await page.goto("/en/results");
  // 40 typed, plus the official registration fee a new plan starts with.
  await expect(page.locator("tr.sum")).toContainText("41");
});
