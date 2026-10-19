import { describe, expect, it } from "vitest";

import { groupsOfCalculator } from "@/lib/calc/catalog";
import { computePlan } from "@/lib/calc/compute";
import { emptyPlan, type PlanState } from "@/lib/calc/model";
import { scenarioTotalCents, subtotalOf } from "@/lib/calc/summary";

function planWith(patch: (plan: PlanState) => void): PlanState {
  const plan = emptyPlan();
  patch(plan);
  return plan;
}

describe("groupsOfCalculator", () => {
  it("lists the fees groups in screen order", () => {
    expect(groupsOfCalculator("fees").map((g) => g.id)).toEqual([
      "entry",
      "documents",
      "interview",
      "afterVisa",
    ]);
  });

  it("lists the moving groups in screen order", () => {
    expect(groupsOfCalculator("moving").map((g) => g.id)).toEqual([
      "travel",
      "housing",
      "household",
      "connectivity",
      "car",
      "healthFamily",
    ]);
  });

  it("puts every item of a calculator in exactly one group", () => {
    const grouped = groupsOfCalculator("fees").flatMap((g) => g.items.map((i) => i.id));
    expect(new Set(grouped).size).toBe(grouped.length);
  });
});

describe("subtotalOf", () => {
  it("adds only the items asked for", () => {
    const plan = planWith((p) => {
      p.items["medicalExam"] = { raw: "100", currency: "usd" };
      p.items["translation"] = { raw: "50", currency: "usd" };
    });
    const result = computePlan(plan);
    expect(subtotalOf(result, ["medicalExam"]).cents).toBe(10_000n);
    expect(subtotalOf(result, ["medicalExam", "translation"]).cents).toBe(15_000n);
  });

  it("flags a subtotal as incomplete when a local amount has no rate", () => {
    const plan = planWith((p) => {
      p.items["medicalExam"] = { raw: "5000", currency: "local" };
    });
    const sub = subtotalOf(computePlan(plan), ["medicalExam"]);
    expect(sub.incomplete).toBe(true);
    expect(sub.cents).toBe(0n);
  });
});

describe("scenarioTotalCents", () => {
  it("adds the savings back to the shortfall", () => {
    const plan = planWith((p) => {
      p.items["medicalExam"] = { raw: "1000", currency: "usd" };
      p.savings = { raw: "400", currency: "usd" };
    });
    const result = computePlan(plan);
    const scenario = result.scenarios[0];
    expect(scenario).toBeDefined();
    if (!scenario) return;
    expect(scenario.requiredCents).toBe(60_000n);
    expect(scenarioTotalCents(scenario, result)).toBe(100_000n);
  });
});
