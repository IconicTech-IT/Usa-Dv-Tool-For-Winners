import { describe, expect, it } from "vitest";

import { groupsOfCalculator } from "@/lib/calc/catalog";
import { computePlan } from "@/lib/calc/compute";
import { emptyPlan, type PlanState } from "@/lib/calc/model";
import {
  forgottenByStage,
  scenarioTotalCents,
  subtotalOf,
  subtotalOfCalculator,
  whatsappUrl,
} from "@/lib/calc/summary";

function planWith(patch: (plan: PlanState) => void): PlanState {
  const plan = emptyPlan();
  patch(plan);
  return plan;
}

describe("groupsOfCalculator", () => {
  it("lists the fees groups in screen order", () => {
    expect(groupsOfCalculator("fees").map((g) => g.id)).toEqual([
      "passport",
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

describe("subtotalOfCalculator", () => {
  it("adds the boxes of one calculator and nothing else", () => {
    const plan = planWith((p) => {
      p.items["medicalExam"] = { raw: "100", currency: "usd" };
      p.items["ticket"] = { raw: "300", currency: "usd" };
      p.items["rent"] = { raw: "1000", currency: "usd" };
    });
    const result = computePlan(plan);
    expect(subtotalOfCalculator(result, "fees").cents).toBe(10_000n);
    expect(subtotalOfCalculator(result, "moving").cents).toBe(30_000n);
    expect(subtotalOfCalculator(result, "monthly").cents).toBe(100_000n);
    expect(subtotalOfCalculator(result, "fees").hasTyped).toBe(true);
  });

  it("says nothing was typed when every box of a calculator is empty", () => {
    const result = computePlan(emptyPlan());
    expect(subtotalOfCalculator(result, "moving").hasTyped).toBe(false);
  });

  it("groups the quick boxes under their calculators in quick mode", () => {
    const plan = planWith((p) => {
      p.uiMode = "quick";
      p.quick["quickPaperwork"] = { raw: "2000", currency: "usd" };
      p.quick["quickTravel"] = { raw: "1500", currency: "usd" };
    });
    const result = computePlan(plan);
    expect(subtotalOfCalculator(result, "fees").cents).toBe(200_000n);
    expect(subtotalOfCalculator(result, "moving").cents).toBe(150_000n);
  });
});

describe("forgottenByStage", () => {
  it("lists the stages that still have empty boxes, and only those", () => {
    const plan = planWith((p) => {
      for (const id of Object.keys(p.items)) p.items[id] = { raw: "1", currency: "usd" };
      p.items["translation"] = { raw: "", currency: "usd" };
    });
    const forgotten = forgottenByStage(computePlan(plan));
    expect(forgotten).toEqual([{ stage: "beforeInterview", itemIds: ["translation"] }]);
  });

  it("lists every stage for an empty plan", () => {
    expect(forgottenByStage(computePlan(emptyPlan())).map((f) => f.stage)).toEqual([
      "beforeEntry",
      "beforeInterview",
      "atInterview",
      "beforeTravel",
      "firstMonth",
      "monthly",
    ]);
  });
});

describe("whatsappUrl", () => {
  it("puts the text in the link, encoded", () => {
    expect(whatsappUrl("a b\n١")).toBe("https://wa.me/?text=a%20b%0A%D9%A1");
  });
});
