import { describe, expect, it } from "vitest";

import { computePlan } from "@/lib/calc/compute";
import { emptyField, emptyPlan, REGISTRATION_FEE_ITEM, type PlanState } from "@/lib/calc/model";

/** Whole US dollars as cents, for readable expectations. */
function usd(dollars: number): bigint {
  return BigInt(dollars) * 100n;
}

function plan(edit: (p: PlanState) => void): PlanState {
  const p = emptyPlan();
  p.items[REGISTRATION_FEE_ITEM] = emptyField(); // a new plan starts with the official fee; count only what the test types
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
    p.household = { adults: 2, children: 2, childAges: ["4", "9"] };
    put(p, "medicalExam", "100"); // adults and anyone 15 or older: x2
    put(p, "medicalExamChild", "40"); // children under 15: x2
    put(p, "policeCertificate", "10"); // 16 or older: only the two adults
    put(p, "translation", "50"); // whole household
    put(p, "visaFee", "30"); // per person at the interview
    put(p, "phoneLine", "20"); // per adult in the first month: x2
    put(p, "rent", "1,000");
    put(p, "food", "٥٠٠"); // per person every month: x4
    put(p, "childcare", "100"); // children under school age every month: x1 (the child of 4)
  });
  const result = computePlan(family);
  const stage = (s: string) => result.stages.find((x) => x.stage === s);

  it("multiplies per-person, per-adult and per-child items by the household", () => {
    expect(stage("beforeInterview")?.cents).toBe(usd(100 * 2 + 40 * 2 + 10 * 2 + 50));
    expect(stage("atInterview")?.cents).toBe(usd(120));
    expect(stage("firstMonth")?.cents).toBe(usd(20 * 2));
  });

  it("sums the monthly items, reading Arabic digits and thousand marks", () => {
    expect(result.monthlyCents).toBe(usd(1000 + 500 * 4 + 100));
  });

  it("builds the one-time total from the four non-monthly stages", () => {
    expect(result.oneTimeCents).toBe(usd(350 + 120 + 40));
  });

  it("lists items nobody typed as empty for 'what did I forget'", () => {
    expect(stage("beforeInterview")?.emptyIds).toContain("militaryCertificate");
    expect(stage("beforeInterview")?.emptyIds).not.toContain("medicalExam");
  });

  it("keeps a running total over the stages in order", () => {
    const cumulative = result.timeline.map((t) => t.cumulativeCents);
    expect(cumulative).toEqual([0n, usd(350), usd(470), usd(470), usd(510), usd(510 + 3100)]);
  });
});

describe("the registration stage", () => {
  const stageOf = (p: PlanState) => computePlan(p).stages[0];

  it("counts the passport for the main applicant only, whatever the household", () => {
    const family = plan((p) => {
      p.household = { adults: 2, children: 2, childAges: ["", ""] };
      put(p, "passport", "40");
    });
    const result = computePlan(family);
    expect(stageOf(family)?.stage).toBe("beforeEntry");
    expect(result.oneTimeCents).toBe(usd(40));
    expect(result.timeline[0]?.cumulativeCents).toBe(usd(40));
  });

  it("counts the entry photos for the applicant, the spouse and every child", () => {
    const photos = (adults: number, children: number) =>
      computePlan(
        plan((p) => {
          p.household = { adults, children, childAges: Array.from({ length: children }, () => "") };
          put(p, "entryPhotos", "10");
        }),
      ).oneTimeCents;
    expect(photos(1, 0)).toBe(usd(10)); // single: the applicant only
    expect(photos(2, 0)).toBe(usd(20)); // married, no children
    expect(photos(2, 3)).toBe(usd(50)); // married with three children
    expect(photos(3, 1)).toBe(usd(30)); // a third adult is not on the entry: applicant, spouse, one child
    expect(photos(1, 2)).toBe(usd(30)); // a single parent still lists the children
  });

  it("counts the passports of the rest of the family: the spouse and every child, not the applicant", () => {
    const rest = (adults: number, children: number) =>
      computePlan(
        plan((p) => {
          p.household = { adults, children, childAges: Array.from({ length: children }, () => "") };
          put(p, "familyPassports", "100");
        }),
      );
    expect(rest(1, 0).oneTimeCents).toBe(0n);
    expect(rest(2, 0).oneTimeCents).toBe(usd(100));
    expect(rest(2, 2).oneTimeCents).toBe(usd(300));
    // They are needed later, before the interview, not at registration.
    expect(rest(2, 2).stages.find((s) => s.stage === "beforeInterview")?.cents).toBe(usd(300));
    expect(rest(2, 2).stages[0]?.cents).toBe(0n);
  });

  it("multiplies the registration fee by the number of entries", () => {
    const fee = (registrations: number) =>
      computePlan(
        plan((p) => {
          p.registrations = registrations;
          put(p, REGISTRATION_FEE_ITEM, "1");
        }),
      ).oneTimeCents;
    expect(fee(1)).toBe(usd(1));
    expect(fee(2)).toBe(usd(2));
  });
});

describe("toggle items (health insurance)", () => {
  it("counts once for the whole household by default and per person when switched", () => {
    const base = plan((p) => {
      p.household = { adults: 2, children: 1, childAges: [""] };
      put(p, "healthInsurance", "300");
    });
    expect(computePlan(base).monthlyCents).toBe(usd(300));

    const perPerson = plan((p) => {
      p.household = { adults: 2, children: 1, childAges: [""] };
      put(p, "healthInsurance", "300", { perPerson: true });
    });
    expect(computePlan(perPerson).monthlyCents).toBe(usd(900));
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
    expect(r.stages.find((s) => s.stage === "beforeInterview")?.cents).toBe(usd(20 + 5));
  });

  it("flags a missing rate and leaves the local amount out of the total", () => {
    const p = plan((q) => {
      put(q, "translation", "1000", { currency: "local" });
      put(q, "visaPhotos", "5");
    });
    const r = computePlan(p);
    expect(r.needsRate).toBe(true);
    const s = r.stages.find((x) => x.stage === "beforeInterview");
    expect(s?.cents).toBe(usd(5));
    expect(s?.incomplete).toBe(true);
  });
});

describe("exact cents", () => {
  it("adds fractional amounts without drift: 0.1 + 0.2 is exactly 0.30", () => {
    const p = plan((q) => {
      put(q, "translation", "0.1");
      put(q, "civilCertificates", "0.2");
    });
    expect(computePlan(p).oneTimeCents).toBe(30n);
  });

  it("rounds each converted amount half up to the cent before adding", () => {
    const p = plan((q) => {
      q.rate = "3";
      put(q, "translation", "1", { currency: "local" }); // 33.33 cents -> 33
      put(q, "civilCertificates", "2", { currency: "local" }); // 66.67 cents -> 67
    });
    expect(computePlan(p).oneTimeCents).toBe(100n);
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
    expect(r.scenarios.map((s) => s.requiredCents)).toEqual([
      usd(600 + 0 + 3000 - 5000),
      usd(600 + 1500 + 3000 - 5000),
      usd(600 + 3000 + 3000 - 5000),
      usd(600 + 4500 + 3000 - 5000),
    ]);
  });

  it("reports a surplus instead of a negative shortfall", () => {
    const first = r.scenarios[0];
    expect(first?.shortfallCents).toBe(0n);
    expect(first?.surplusCents).toBe(usd(1400));
    expect(r.scenarios[3]?.shortfallCents).toBe(usd(3100));
  });

  it("reduces the monthly cost by income and spouse income after the job starts", () => {
    expect(r.netMonthlyAfterStartCents).toBe(usd(1500 - 2500));
  });

  it("accepts a fractional buffer in months", () => {
    const half = plan((q) => {
      put(q, "rent", "1000");
      q.bufferMonths = "1.5";
    });
    expect(computePlan(half).scenarios[0]?.requiredCents).toBe(usd(1500));
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
    expect(r.oneTimeCents).toBe(usd(400));
    expect(r.monthlyCents).toBe(usd(1200));
  });
});
