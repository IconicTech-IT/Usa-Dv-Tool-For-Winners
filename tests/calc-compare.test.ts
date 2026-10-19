import { describe, expect, it } from "vitest";

import { summarizePlan } from "@/lib/calc/compare";
import { emptyPlan, type PlanState } from "@/lib/calc/model";

function plan(edit: (p: PlanState) => void): PlanState {
  const p = emptyPlan();
  edit(p);
  return p;
}

describe("summarizePlan", () => {
  it("reads the totals, the safest scenario and what is still to save", () => {
    const summary = summarizePlan(
      "alone.json",
      plan((p) => {
        p.items["medicalExam"] = { raw: "1000", currency: "usd" };
        p.items["rent"] = { raw: "500", currency: "usd" };
        p.savings = { raw: "1000", currency: "usd" };
      }),
    );
    expect(summary.name).toBe("alone.json");
    expect(summary.oneTimeCents).toBe(100_000n);
    expect(summary.monthlyCents).toBe(50_000n);
    // one-time + 3 months of costs, before savings
    expect(summary.safestTotalCents).toBe(250_000n);
    expect(summary.savingsCents).toBe(100_000n);
    expect(summary.stillToSaveCents).toBe(150_000n);
    expect(summary.incomplete).toBe(false);
  });

  it("counts the household and compares two plans in one currency", () => {
    const alone = summarizePlan(
      "a",
      plan((p) => (p.items["visaFee"] = { raw: "100", currency: "usd" })),
    );
    const family = summarizePlan(
      "b",
      plan((p) => {
        p.household = { adults: 2, children: 2, childAges: ["", ""] };
        p.items["visaFee"] = { raw: "100", currency: "usd" };
      }),
    );
    expect(alone.oneTimeCents).toBe(10_000n);
    expect(family.oneTimeCents).toBe(40_000n);
    expect([family.adults, family.children]).toEqual([2, 2]);
  });

  it("flags a plan whose local amounts have no rate", () => {
    const summary = summarizePlan(
      "x",
      plan((p) => (p.items["rent"] = { raw: "9000", currency: "local" })),
    );
    expect(summary.incomplete).toBe(true);
  });
});
