import { expect, test, type Locator, type Page } from "@playwright/test";

/** Opens a page and waits until it has loaded its scripts, so typing is not lost before the page is ready. */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** The box with this label, by the text of its label. */
function box(page: Page, label: string): Locator {
  return page.locator(".field", { has: page.getByText(label, { exact: true }) });
}

async function familyWithTwoChildren(page: Page): Promise<void> {
  await open(page, "/en/setup");
  await page.getByRole("button", { name: "With family" }).click();
  const kids = page.getByRole("group", { name: "Children" });
  await kids.getByRole("button", { name: "Increase" }).click();
  await kids.getByRole("button", { name: "Increase" }).click();
}

test("each child's age decides who each cost counts, and the boxes follow the ages", async ({ page }) => {
  await familyWithTwoChildren(page);

  // No age yet: one line says what is assumed.
  const nudge = page.getByText("One or more children have no age yet");
  await expect(nudge).toBeVisible();
  await page.getByLabel("Child 1").fill("1");
  await page.getByLabel("Child 2").fill("9");
  await expect(nudge).toHaveCount(0);

  // The fees: the medical exam has a box for the adults and anyone 15 or older, and one for the children.
  await open(page, "/en/fees");
  const adults = box(page, "Medical exam: adults and anyone 15 or older");
  const children = box(page, "Medical exam: children under 15");
  await adults.locator("input").fill("100");
  await children.locator("input").fill("40");
  await expect(adults).toContainText("× 2 people = $");
  await expect(children).toContainText("× 2 children = $");
  const police = box(page, "Police certificate");
  await police.locator("input").fill("10");
  await expect(police).toContainText("× 2 people = $");
  await expect(police).toContainText("Per person aged 16 or older");

  // The tickets: three boxes, and the infant box is there because one child is under two.
  await open(page, "/en/moving");
  await box(page, "Flight ticket: adult (12 or older)").locator("input").fill("600");
  await box(page, "Flight ticket: child aged 2 to 11").locator("input").fill("400");
  await box(page, "Flight ticket: infant under 2").locator("input").fill("100");
  await expect(box(page, "Flight ticket: adult (12 or older)")).toContainText("× 2 people = $");
  await expect(box(page, "Flight ticket: child aged 2 to 11")).toContainText("× 1 child = $");
  await expect(box(page, "Flight ticket: infant under 2")).toContainText("× 1 infant = $");
});

test("a box shows only when someone is in its group, and the driving tests count adults only", async ({
  page,
}) => {
  await familyWithTwoChildren(page);
  await page.getByLabel("Child 1").fill("16");
  await page.getByLabel("Child 2").fill("9");

  await open(page, "/en/moving");
  await expect(page.getByText("Flight ticket: infant under 2", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Flight ticket: child aged 2 to 11", { exact: true })).toBeVisible();
  const licence = box(page, "Driver licence tests");
  await licence.locator("input").fill("50");
  await expect(licence).toContainText("× 2 adults = $");

  // The childcare box is for children under 5: neither child is, so it is not on the page.
  await expect(page.getByText("Childcare or daycare (first payment)", { exact: true })).toHaveCount(0);

  await open(page, "/en/fees");
  await expect(box(page, "Police certificate")).toContainText("Per person aged 16 or older");
  await box(page, "Police certificate").locator("input").fill("10");
  await expect(box(page, "Police certificate")).toContainText("× 3 people = $"); // two adults and the 16-year-old
});

test("a plan saved before ages were asked still works, with one line asking for the ages", async ({
  page,
}) => {
  await page.addInitScript(() =>
    window.localStorage.setItem(
      "dv-compass:plan:v1",
      JSON.stringify({
        version: 1,
        name: "",
        uiMode: "detailed",
        household: { adults: 2, children: 2, childAges: [] },
        localCurrency: "EGP",
        rate: "",
        items: { medicalExamChild: { raw: "40", currency: "usd" } },
        quick: {},
        income: { raw: "", currency: "usd" },
        spouseIncome: { raw: "", currency: "usd" },
        savings: { raw: "", currency: "usd" },
        bufferMonths: "",
        registrations: 1,
      }),
    ),
  );
  await open(page, "/en/fees");
  await expect(
    page.getByText("A child has no age yet, so we count them as a child aged 2 to 11."),
  ).toBeVisible();
  await expect(box(page, "Medical exam: children under 15")).toContainText("× 2 children = $");
  await page.getByRole("link", { name: "Type the ages" }).click();
  await page.waitForURL("**/en/setup");
});
