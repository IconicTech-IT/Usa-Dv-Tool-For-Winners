import { describe, expect, it } from "vitest";

import { ALONE_MONTHLY_ITEMS, ITEMS, QUICK_ITEMS } from "@/lib/calc/catalog";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

/**
 * Owner rule (2026-10-19): an item's name says plainly what it covers. Where a name could be read two
 * ways it has a one-line "Includes: ..." under it. No name is used twice, and no line holds a price.
 */

const ALL_IDS = [...ITEMS, ...QUICK_ITEMS].map((item) => item.id);
const ONE_LINE = 125;
const ONE_LINE_EN = 150;

describe.each([
  ["ar", ar],
  ["en", en],
] as const)("item names (%s)", (_language, messages) => {
  const names = ALL_IDS.map((id) => [id, (messages.calc.items as Record<string, string>)[id] ?? ""] as const);

  it("never use the same name for two items", () => {
    const seen = new Map<string, string>();
    for (const [id, name] of names) {
      expect(seen.get(name), `"${name}" is the name of both ${seen.get(name)} and ${id}`).toBeUndefined();
      seen.set(name, id);
    }
  });

  it("have a plain name for the catch-all boxes, not just 'other'", () => {
    for (const id of ["otherPaperwork", "otherMoving", "otherMonthly"]) {
      const name = (messages.calc.items as Record<string, string>)[id] ?? "";
      expect(name, id).not.toMatch(/^(أخرى|other)$/i);
    }
  });

  it("say whether a cost is the first payment or every month when the item has a twin", () => {
    const marked = ["food", "healthInsurance", "carInsurance", "childcare", "phone"];
    const pattern = _language === "ar" ? /\(شهريًا\)/ : /\(monthly\)/;
    for (const id of marked) {
      expect((messages.calc.items as Record<string, string>)[id], id).toMatch(pattern);
    }
    const first = _language === "ar" ? /\(أول (دفعة|شهر)\)/ : /\(first (payment|month)\)/;
    for (const id of ["carInsuranceStart", "childcareStart", "healthInsuranceStart"]) {
      expect((messages.calc.items as Record<string, string>)[id], id).toMatch(first);
    }
  });
});

describe("the 'Includes' lines", () => {
  const arLines = ar.calc.itemIncludes as Record<string, string>;
  const enLines = en.calc.itemIncludes as Record<string, string>;

  it("exist in both languages for the same items, and only for items that exist", () => {
    expect(Object.keys(arLines).sort()).toEqual(Object.keys(enLines).sort());
    for (const id of Object.keys(arLines)) expect(ALL_IDS, id).toContain(id);
  });

  it("are one line, and name no amount of money (ages are fine)", () => {
    // English takes more letters than Arabic for the same line.
    for (const [lines, limit] of [
      [arLines, ONE_LINE],
      [enLines, ONE_LINE_EN],
    ] as const) {
      for (const [id, text] of Object.entries(lines)) {
        expect(text.length, id).toBeLessThanOrEqual(limit);
        // ages are numbers and are fine; an amount of money is not
        expect(text, id).not.toMatch(/[$]|[0-9٠-٩]s?(USD|EGP|SAR|جنيه|دولار|ريال|dollars?|pounds?)/i);
      }
    }
  });

  it("have a label word in each language", () => {
    expect(ar.calc.includesLabel).toBe("يشمل:");
    expect(en.calc.includesLabel).toBe("Includes:");
  });

  it("explain every catch-all box, every quick box and every item that could be read two ways", () => {
    for (const id of [
      "otherPaperwork",
      "otherMoving",
      "otherMonthly",
      "quickPaperwork",
      "quickTravel",
      "quickHousing",
      "quickCar",
      "quickMonthly",
      "householdBasics",
      "securityDeposit",
      "utilityDeposits",
      "carInsuranceStart",
      "healthInsuranceStart",
      "childcareStart",
      "phoneLine",
      "phone",
      "food",
      "temporaryStay",
      "furniture",
    ]) {
      expect(arLines[id], id).toBeDefined();
    }
  });

  it("know the boxes of the months alone too", () => {
    for (const item of ALONE_MONTHLY_ITEMS) expect(ALL_IDS).toContain(item.id);
  });
});

describe("the deposit boxes", () => {
  it("say it is a rental deposit that comes back, not a purchase, in the words people use", () => {
    expect(ar.calc.items.securityDeposit).toBe("تأمين إيجار الشقة (بيرجع)");
    expect(ar.calc.itemIncludes.securityDeposit).toContain("بيرجعلك لما تسيب الشقة");
    expect(ar.calc.itemIncludes.securityDeposit).toContain("ده إيجار مش شرا");
    expect(en.calc.items.securityDeposit).toBe("Rental security deposit (refundable)");
    expect(en.calc.itemIncludes.securityDeposit).toContain("A rental, not a purchase");
    expect(ar.calc.items.utilityDeposits).toBe("تأمين فتح الكهرباء والمياه والنت");
    expect(ar.calc.itemIncludes.utilityDeposits).toContain("من غير تاريخ ائتماني");
    expect(en.calc.items.utilityDeposits).toBe("Utility and internet deposits");
  });

  it("leave no housing label that could be read as buying a home", () => {
    const labels = [
      ...Object.values(ar.calc.items),
      ...Object.values(ar.calc.groupHints),
      ...Object.values(ar.calc.itemIncludes),
      ar.quick.housing,
    ];
    // the Arabic word for a bank deposit, and wording about owning or buying a flat or a house
    for (const label of labels) expect(label).not.toMatch(/وديعة|شراء (شقة|بيت)|تمليك|اشتري/);
    const english = [
      ...Object.values(en.calc.items),
      ...Object.values(en.calc.groupHints),
      ...Object.values(en.calc.itemIncludes),
      en.quick.housing,
    ];
    for (const label of english)
      expect(label).not.toMatch(/buy (a|the) (flat|home|house)|mortgage|down payment/i);
    // the only purchase on the site is the car
    const purchases = Object.entries(ar.calc.items).filter(([, name]) => /شراء/.test(name));
    expect(purchases.map(([id]) => id)).toEqual(["carPurchase"]);
  });
});

describe("the home supplies box", () => {
  it("is called what it is, and says the food is somewhere else", () => {
    expect(ar.calc.items.householdBasics).toBe("مستلزمات البيت أول ما توصل");
    expect(ar.calc.itemIncludes.householdBasics).toContain("أدوات مطبخ، مفارش وبطاطين، حاجات تنضيف وحمام");
    expect(ar.calc.itemIncludes.householdBasics).toContain("الأكل مش هنا، ده في المصاريف الشهرية");
    expect(en.calc.items.householdBasics).toBe("Home supplies on arrival");
    expect(en.calc.itemIncludes.householdBasics).toContain("Food is not here");
    expect(Object.values(ar.calc.items)).not.toContain("أساسيات البيت");
  });

  it("is told apart from the monthly food, which says it is food and groceries every month", () => {
    expect(ar.calc.items.food).toBe("الأكل والبقالة (شهريًا)");
    expect(en.calc.items.food).toBe("Food and groceries (monthly)");
  });
});
