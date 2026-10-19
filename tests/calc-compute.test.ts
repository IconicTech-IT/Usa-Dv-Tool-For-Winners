import { describe, expect, it } from "vitest";

import { computePlan } from "@/lib/calc/compute";
import { emptyPlan, type PlanState } from "@/lib/calc/model";

function plan(edit: (p: PlanState) => void): PlanState {
  const p = emptyPlan();
  edit(p);
  return p;
}

interface PutOptions {
  currency?: "usd" | "local";
  perPerson?: boolean;
}

function put(p: PlanState, id: string, raw: string, options: PutOptions = {}) {
  const { currency = "usd", perPerson } = options;
  p.items[id] = perPerson === undefined ? { raw, currency } : { raw, currency, perPerson };
}

describe("stage totals and per-person items", () => {
  const family = plan((p) => {
    p.household = { adults: 2, children: 2, childAges: ["", ""] };
    put(p, "medicalExam", "100"); // per person: x4
    put(p, "policeCertificate", "10"); // per person: x4
    put(p, "translation", "50"); // whole household
    put(p, "visaFee", "30"); // per person at the interview
    put(p, "phoneLine", "20"); // per adult in the first month: x2
    put(p, "rent", "1,000");
    put(p, "food", "٥٠٠"); // per person every month: x4
    put(p, "childcare", "100"); // per child every month: x2
  });
  const result = computePlan(family);
  const stage = (s: string) => result.stages.find((x) => x.stage === s);

  it("multiplies per-person, per-adult and per-child items by the household", () => {
    expect(stage("beforeInterview")?.usd).toBe(100 * 4 + 10 * 4 + 50);
    expect(stage("atInterview")?.usd).toBe(120);
    expect(stage("firstMonth")?.usd).toBe(20 * 2);
  });

  it("sums the monthly items, reading Arabic digits and thousand marks", () => {
    expect(result.monthlyUsd).toBe(1000 + 500 * 4 + 100 * 2);
  });

  it("builds the one-time total from the four non-monthly stages", () => {
    expect(result.oneTimeUsd).toBe(490 + 120 + 40);
  });

  it("lists items nobody typed as empty for 'what did I forget'", () => {
    expect(stage("beforeInterview")?.emptyIds).toContain("militaryCertificate");
    expect(stage("beforeInterview")?.emptyIds).not.toContain("medicalExam");
  });

  it("keeps a running total over the stages in order", () => {
    const cumulative = result.timeline.map((t) => t.cumulativeUsd);
    expect(cumulative).toEqual([490, 610, 610, 650, 650 + 3200]);
  });
});

describe("toggle items (health insurance)", () => {
  it("counts once for the whole household by default and per person when switched", () => {
    const base = plan((p) => {
      p.household = { adults: 2, children: 1, childAges: [""] };
      put(p, "healthInsurance", "300");
    });
    expect(computePlan(base).monthlyUsd).toBe(300);

    const perPerson = plan((p) => {
      p.household = { adults: 2, children: 1, childAges: [""] };
      put(p, "healthInsurance", "300", { perPerson: true });
    });
    expect(computePlan(perPerson).monthlyUsd).toBe(900);
  });
});

describe("currency per field", () => {
  it("converts local fields with the typed rate", () => {
    const p = plan((q) => {
      q.rate = "50";
      put(q, "translation", "1000", { currency: "local" });
      put(q, "visaPhotos", "5");
    });
    const r = computePlan(p);
    expect(r.needsRate).toBe(false);
    expect(r.stages.find((s) => s.stage === "beforeInterview")?.usd).toBe(20 + 5);
  });

  it("flags a missing rate and leaves the local amount out of the total", () => {
    const p = plan((q) => {
      put(q, "translation", "1000", { currency: "local" });
      put(q, "visaPhotos", "5");
    });
    const r = computePlan(p);
    expect(r.needsRate).toBe(true);
    const s = r.stages.find((x) => x.stage === "beforeInterview");
    expect(s?.usd).toBe(5);
    expect(s?.incomplete).toBe(true);
  });
});

describe("runway scenarios", () => {
  const p = plan((q) => {
    q.household = { adults: 2, children: 0, childAges: [] };
    put(q, "visaFee", "300"); // x2 = 600 one-time
    put(q, "rent", "1000");
    put(q, "food", "250"); // per person x2 = 500, so the monthly total is 1500
    q.savings = { raw: "5000", currency: "usd" };
    q.bufferMonths = "2";
    q.income = { raw: "2000", currency: "usd" };
    q.spouseIncome = { raw: "500", currency: "usd" };
  });
  const r = computePlan(p);

  it("needs one-time + monthly x n + buffer x monthly - savings for n = 0..3", () => {
    expect(r.scenarios.map((s) => s.startMonth)).toEqual([0, 1, 2, 3]);
    expect(r.scenarios.map((s) => s.requiredUsd)).toEqual([
      600 + 0 + 3000 - 5000,
      600 + 1500 + 3000 - 5000,
      600 + 3000 + 3000 - 5000,
      600 + 4500 + 3000 - 5000,
    ]);
  });

  it("reports a surplus instead of a negative shortfall", () => {
    const first = r.scenarios[0];
    expect(first?.shortfallUsd).toBe(0);
    expect(first?.surplusUsd).toBe(1400);
    expect(r.scenarios[3]?.shortfallUsd).toBe(3100);
  });

  it("reduces the monthly cost by income and spouse income after the job starts", () => {
    expect(r.netMonthlyAfterStartUsd).toBe(1500 - 2500);
  });
});

describe("validation and quick mode", () => {
  it("flags unreadable text as invalid and counts zero as typed", () => {
    const p = plan((q) => {
      put(q, "translation", "abc");
      put(q, "visaPhotos", "0");
    });
    const r = computePlan(p);
    expect(r.items.find((i) => i.id === "translation")?.invalid).toBe(true);
    expect(r.items.find((i) => i.id === "translation")?.typed).toBe(false);
    expect(r.items.find((i) => i.id === "visaPhotos")?.typed).toBe(true);
  });

  it("uses the five quick boxes when the mode is quick", () => {
    const p = plan((q) => {
      q.uiMode = "quick";
      q.quick["quickPaperwork"] = { raw: "400", currency: "usd" };
      q.quick["quickMonthly"] = { raw: "1,200", currency: "usd" };
      put(q, "rent", "9999"); // detailed values are ignored in quick mode
    });
    const r = computePlan(p);
    expect(r.items).toHaveLength(5);
    expect(r.oneTimeUsd).toBe(400);
    expect(r.monthlyUsd).toBe(1200);
  });
});
