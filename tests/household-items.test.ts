import { describe, expect, it } from "vitest";

import { countUnitOf, ITEMS, type CountUnit, type Scaling } from "@/lib/calc/catalog";
import { computePlan } from "@/lib/calc/compute";
import { emptyField, emptyPlan, REGISTRATION_FEE_ITEM, type PlanState } from "@/lib/calc/model";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

function usd(dollars: number): bigint {
  return BigInt(dollars) * 100n;
}

function planWith(adults: number, children: number, typed: Record<string, string>): PlanState {
  const plan = emptyPlan();
  plan.items[REGISTRATION_FEE_ITEM] = emptyField(); // count only what the test types
  plan.household = { adults, children, childAges: Array.from({ length: children }, () => "") };
  for (const [id, raw] of Object.entries(typed)) plan.items[id] = { raw, currency: "usd" };
  return plan;
}

function itemOf(plan: PlanState, id: string) {
  const item = computePlan(plan).items.find((i) => i.id === id);
  if (!item) throw new Error(`no result for ${id}`);
  return item;
}

describe("items that count nobody in the household", () => {
  it("are not applicable, and add nothing, for a person alone", () => {
    const alone = planWith(1, 0, { familyPassports: "4000", childcare: "100", medicalExam: "100" });
    const result = computePlan(alone);

    expect(itemOf(alone, "familyPassports").applicable).toBe(false);
    expect(itemOf(alone, "childcare").applicable).toBe(false);
    expect(itemOf(alone, "medicalExam").applicable).toBe(true);
    // Only the medical exam (one person) is counted; the 4000 typed before is ignored.
    expect(result.oneTimeCents).toBe(usd(100));
    expect(result.monthlyCents).toBe(0n);
  });

  it("are not listed as forgotten, because the user cannot see them", () => {
    const alone = planWith(1, 0, {});
    const forgotten = computePlan(alone).stages.flatMap((stage) => stage.emptyIds);
    expect(forgotten).not.toContain("familyPassports");
    expect(forgotten).not.toContain("childcare");
    expect(forgotten).toContain("medicalExam");
  });

  it("come back, with the value typed earlier, when a spouse or children are added", () => {
    const typed = { familyPassports: "4000" };
    const withSpouse = planWith(2, 0, typed);
    expect(itemOf(withSpouse, "familyPassports")).toMatchObject({ applicable: true, multiplier: 1 });
    expect(computePlan(withSpouse).oneTimeCents).toBe(usd(4000));

    const withChildren = planWith(1, 3, typed);
    expect(itemOf(withChildren, "familyPassports")).toMatchObject({ applicable: true, multiplier: 3 });
    expect(computePlan(withChildren).oneTimeCents).toBe(usd(12000));
  });

  it("do not count again after the household goes back to one person, and the text is kept", () => {
    const plan = planWith(2, 1, { familyPassports: "1000" });
    expect(computePlan(plan).oneTimeCents).toBe(usd(2000));

    plan.household = { adults: 1, children: 0, childAges: [] };
    expect(computePlan(plan).oneTimeCents).toBe(0n);
    expect(plan.items["familyPassports"]?.raw).toBe("1000");

    plan.household = { adults: 3, children: 0, childAges: [] };
    expect(computePlan(plan).oneTimeCents).toBe(usd(1000)); // only one spouse is written on the entry
  });

  it("show no error for unreadable text while hidden", () => {
    const alone = planWith(1, 0, { familyPassports: "abc" });
    expect(itemOf(alone, "familyPassports")).toMatchObject({ applicable: false, invalid: false });
  });
});

describe("what a multiplier counts", () => {
  it("names the unit of every scaled item, and none for whole-household or applicant-only items", () => {
    const expected: Record<Scaling, CountUnit | null> = {
      total: null,
      applicantOnly: null,
      perPerson: "people",
      perEntrant: "people",
      perFamilyMember: "people",
      perAdult: "adults",
      perChild: "children",
      perRegistration: "entries",
    };
    for (const [scaling, unit] of Object.entries(expected)) {
      expect(countUnitOf(scaling as Scaling), scaling).toBe(unit);
    }
    for (const item of ITEMS) expect(Object.keys(expected)).toContain(item.scaling);
  });

  it("reports the multiplier that the line under the box shows", () => {
    const family = planWith(2, 2, { medicalExam: "100", phoneLine: "20", childcare: "50" });
    expect(itemOf(family, "medicalExam")).toMatchObject({ multiplier: 4, cents: usd(400) });
    expect(itemOf(family, "phoneLine")).toMatchObject({ multiplier: 2, cents: usd(40) });
    expect(itemOf(family, "childcare")).toMatchObject({ multiplier: 2, cents: usd(100) });
  });

  it("has a message for every unit in both languages, written with the same placeholders", () => {
    const units: CountUnit[] = ["people", "adults", "children", "entries"];
    for (const messages of [ar, en]) {
      expect(Object.keys(messages.calc.multiplier).sort()).toEqual([...units].sort());
      for (const unit of units) {
        const text = messages.calc.multiplier[unit];
        expect(text).toContain("{shown}");
        expect(text).toContain("{count, plural,");
      }
    }
  });
});

describe("the names of the two official fees at the interview and after the visa", () => {
  it("call the first the interview fee (DV fee) and the second the green card fee", () => {
    expect(ar.calc.items.visaFee).toBe("رسوم المقابلة (رسوم الـDV)");
    expect(en.calc.items.visaFee).toBe("Interview fee (DV fee)");
    expect(ar.calc.items.immigrantFee).toBe("رسوم الجرين كارد (USCIS Immigrant Fee)");
    expect(en.calc.items.immigrantFee).toBe("Green card fee (USCIS Immigrant Fee)");
  });
});
