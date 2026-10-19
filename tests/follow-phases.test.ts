import { describe, expect, it } from "vitest";

import { groupsOfCalculator, ITEMS } from "@/lib/calc/catalog";
import { computePlan } from "@/lib/calc/compute";
import {
  emptyField,
  emptyPlan,
  PlanStateSchema,
  REGISTRATION_FEE_ITEM,
  type PlanState,
} from "@/lib/calc/model";
import { setFollowMonths, setTravelMode } from "@/lib/calc/plan-actions";
import { parsePlanFile, serializePlan } from "@/lib/calc/plan-file";
import { summarizePlan } from "@/lib/calc/compare";
import { followMonthsOf, isLateArrival } from "@/lib/calc/scaling";
import { groupSubtotal } from "@/lib/calc/summary";
import { compactPlan, expandPlan } from "@/lib/transfer/codec";

function usd(dollars: number): bigint {
  return BigInt(dollars) * 100n;
}

/** Two adults and a child; the amounts below are whole dollars typed per box. */
function family(typed: Record<string, string>, months: string, extra: Partial<PlanState> = {}): PlanState {
  const plan = emptyPlan();
  plan.items[REGISTRATION_FEE_ITEM] = emptyField();
  plan.household = { adults: 2, children: 1, childAges: [""] };
  plan.travel = { mode: "follow", followMonths: months };
  for (const [id, raw] of Object.entries(typed)) plan.items[id] = { raw, currency: "usd" };
  return { ...plan, ...extra };
}

const TYPED = {
  medicalExam: "100", // per person, paperwork: the same for everyone
  ticket: "600", // per person
  temporaryStay: "200", // the principal's arrival
  securityDeposit: "1000", // the family's arrival
  phoneLine: "20", // per adult
  childcareStart: "300", // per child
  winterClothes: "50", // per person
  healthInsuranceStart: "400", // whole household
  rent: "1000", // whole household, monthly
  food: "100", // per person, monthly
  childcare: "50", // per child, monthly
  familyAbroadMonthly: "70", // only while the family is apart
};

function stageOf(plan: PlanState, stage: string): bigint {
  return computePlan(plan).stages.find((s) => s.stage === stage)?.cents ?? -1n;
}

describe("a family that arrives after the principal: the stages", () => {
  const plan = family(TYPED, "4");

  it("keeps the paperwork the same for everyone, counted in its own stage", () => {
    expect(stageOf(plan, "beforeInterview")).toBe(usd(300)); // 100 x 3 people
  });

  it("puts the principal's ticket at departure and the family's tickets when the family arrives", () => {
    expect(stageOf(plan, "beforeTravel")).toBe(usd(600));
    // the family's tickets are per family member: 2 more people
    expect(stageOf(plan, "familyArrival")).toBe(usd(1200 + 1000 + 20 + 300 + 100));
  });

  it("splits the arrival: the principal alone at his stage, the family's share when it arrives", () => {
    // temporary stay 200, phone 20 x1, winter clothes 50 x1, health insurance (whole household) 400
    expect(stageOf(plan, "firstMonth")).toBe(usd(200 + 20 + 50 + 400));
  });

  it("counts the months alone at the principal's costs plus the family's costs back home", () => {
    // per month alone: rent 1000, food 100 x1, no childcare, family back home 70
    const result = computePlan(plan);
    expect(result.follow?.aloneMonthlyCents).toBe(usd(1000 + 100 + 70));
    expect(stageOf(plan, "aloneMonths")).toBe(usd((1000 + 100 + 70) * 4));
  });

  it("counts the whole family's month after it arrives, without the family's costs back home", () => {
    expect(computePlan(plan).monthlyCents).toBe(usd(1000 + 100 * 3 + 50));
  });

  it("sums the one-time money into the total and the cash needed until the family arrives", () => {
    const result = computePlan(plan);
    const oneTime = 300 + 600 + (200 + 20 + 50 + 400) + (1200 + 1000 + 20 + 300 + 100);
    expect(result.oneTimeCents).toBe(usd(oneTime));
    expect(result.follow?.months).toBe(4);
    expect(result.follow?.cashByArrivalCents).toBe(usd(oneTime + 1170 * 4));
  });

  it("shows the stages in order, ending with one month of the whole family", () => {
    const { timeline, follow, monthlyCents } = computePlan(plan);
    expect(timeline.map((entry) => entry.stage)).toEqual([
      "beforeEntry",
      "beforeInterview",
      "atInterview",
      "beforeTravel",
      "firstMonth",
      "aloneMonths",
      "familyArrival",
      "monthly",
    ]);
    const beforeMonthly = timeline[timeline.length - 2]?.cumulativeCents;
    expect(beforeMonthly).toBe(follow?.cashByArrivalCents);
    expect(timeline[timeline.length - 1]?.cumulativeCents).toBe((beforeMonthly ?? 0n) + monthlyCents);
  });

  it("does not list the family items as forgotten under the principal's arrival", () => {
    const empty = family({}, "4");
    const result = computePlan(empty);
    const under = (stage: string) => result.stages.find((s) => s.stage === stage)?.emptyIds ?? [];
    expect(under("familyArrival")).toEqual(expect.arrayContaining(["securityDeposit", "childcareStart"]));
    expect(under("firstMonth")).not.toContain("securityDeposit");
    expect(under("firstMonth")).toContain("temporaryStay");
    expect(under("aloneMonths")).toContain("familyAbroadMonthly");
  });
});

describe("a family that arrives after the principal: the job scenarios", () => {
  const monthsOf = (months: string, buffer = "") => {
    const plan = family(TYPED, months);
    plan.bufferMonths = buffer;
    return computePlan(plan);
  };
  const oneTime = usd(300 + 600 + 670 + 2620);
  const alone = usd(1170);
  const together = usd(1350);

  it("prices every month alone at the principal's costs while the family is still apart", () => {
    const needed = monthsOf("6").scenarios.map((s) => s.requiredCents);
    expect(needed).toEqual([oneTime, oneTime + alone, oneTime + alone * 2n, oneTime + alone * 3n]);
  });

  it("prices the months after the family arrives at the whole family's costs", () => {
    const needed = monthsOf("2").scenarios.map((s) => s.requiredCents);
    expect(needed).toEqual([oneTime, oneTime + alone, oneTime + alone * 2n, oneTime + alone * 2n + together]);
  });

  it("prices the buffer after the job starts at the phase it falls in", () => {
    // job after 1 month, 2 months of buffer, family arrives after 2: months 1-2 alone, month 3 together
    expect(monthsOf("2", "2").scenarios[1]?.requiredCents).toBe(oneTime + alone * 2n + together);
  });

  it("prices a fraction of a month at the phase of the month it starts", () => {
    // family arrives after 1 month; job after 1 month plus half a month: month 1 alone, half of month 2 together
    expect(monthsOf("1", "0.5").scenarios[1]?.requiredCents).toBe(oneTime + alone + together / 2n);
  });

  it("takes the savings off, as before", () => {
    const plan = family(TYPED, "4");
    plan.savings = { raw: "5000", currency: "usd" };
    const first = computePlan(plan).scenarios[0];
    expect(first?.requiredCents).toBe(oneTime - usd(5000));
  });
});

describe("the warning about a long wait before the family arrives", () => {
  it("starts at four months, never for a missing number, and is only a warning", () => {
    expect(isLateArrival(null)).toBe(false);
    expect(isLateArrival(3)).toBe(false);
    expect(isLateArrival(4)).toBe(true);
    expect(isLateArrival(24)).toBe(true);
    // a long wait still calculates: nothing is blocked
    expect(computePlan(family(TYPED, "12")).follow?.months).toBe(12);
  });
});

describe("when the family follows later does not apply", () => {
  it("is unchanged for a household that travels together", () => {
    const plan = family(TYPED, "4");
    plan.travel = { mode: "together", followMonths: "4" };
    const result = computePlan(plan);
    expect(result.follow).toBeNull();
    // the ticket and everything else count for all three people, in the usual stages
    expect(stageOf(plan, "beforeTravel")).toBe(usd(1800));
    expect(stageOf(plan, "familyArrival")).toBe(0n);
    expect(result.timeline.map((entry) => entry.stage)).not.toContain("aloneMonths");
    expect(result.items.find((i) => i.id === "familyAbroadMonthly")?.applicable).toBe(false);
  });

  it("is ignored for a person alone, but the choice is kept", () => {
    const plan = family(TYPED, "4");
    plan.household = { adults: 1, children: 0, childAges: [] };
    expect(computePlan(plan).follow).toBeNull();
    expect(plan.travel.mode).toBe("follow");
  });

  it("waits for a whole number of months from 1 to 24", () => {
    for (const raw of ["", "abc", "0", "25", "2.5", "-3"]) {
      expect(followMonthsOf(family(TYPED, raw)), raw).toBeNull();
    }
    for (const [raw, months] of [
      ["1", 1],
      ["٦", 6],
      ["24", 24],
    ] as const) {
      expect(followMonthsOf(family(TYPED, raw)), raw).toBe(months);
    }
  });

  it("is ignored by the quick boxes, which are whole-household totals", () => {
    const plan = family({}, "4");
    plan.uiMode = "quick";
    expect(computePlan(plan).follow).toBeNull();
  });

  it("shows the family's costs back home only while the family follows later", () => {
    const together = family(TYPED, "4");
    together.travel = { mode: "together", followMonths: "" };
    expect(computePlan(together).items.find((i) => i.id === "familyAbroadMonthly")?.applicable).toBe(false);
    expect(
      computePlan(family(TYPED, "4")).items.find((i) => i.id === "familyAbroadMonthly")?.applicable,
    ).toBe(true);
  });
});

describe("the moving calculator when the family follows later", () => {
  const arrivals = groupsOfCalculator("moving", true);
  const idsOf = (group: string) => arrivals.find((g) => g.id === group)?.items.map((i) => i.id) ?? [];

  it("keeps the travel group and replaces the first-month groups by two cards", () => {
    expect(arrivals.map((g) => g.id)).toEqual(["travel", "arrivalAlone", "arrivalFamily"]);
    expect(arrivals.map((g) => g.stage)).toEqual(["beforeTravel", "firstMonth", "familyArrival"]);
  });

  it("puts each first-month item on exactly one card", () => {
    const firstMonth = ITEMS.filter((i) => i.calculator === "moving" && i.stage === "firstMonth").map(
      (i) => i.id,
    );
    expect([...idsOf("arrivalAlone"), ...idsOf("arrivalFamily")].sort()).toEqual(firstMonth.sort());
  });

  it("puts the housing, furniture and childcare on the family's card and the rest on the principal's", () => {
    expect(idsOf("arrivalFamily")).toEqual(
      expect.arrayContaining(["securityDeposit", "firstMonthRent", "furniture", "childcareStart"]),
    );
    expect(idsOf("arrivalAlone")).toEqual(
      expect.arrayContaining(["temporaryStay", "phoneLine", "householdBasics", "winterClothes"]),
    );
  });

  it("is the usual list of groups when everyone travels together", () => {
    expect(groupsOfCalculator("moving").map((g) => g.id)).toEqual([
      "travel",
      "housing",
      "household",
      "connectivity",
      "car",
      "healthFamily",
    ]);
  });
});

describe("saving, opening and moving a plan that follows later", () => {
  it("sets the choice and the typed months, and ignores a repeat", () => {
    const base = emptyPlan();
    expect(setTravelMode(base, "together")).toBe(base);
    const follow = setTravelMode(base, "follow");
    expect(follow.travel.mode).toBe("follow");
    expect(setFollowMonths(follow, "5").travel.followMonths).toBe("5");
    expect(setFollowMonths(follow, "")).toBe(follow);
  });

  it("is loaded as 'all together' when the plan was saved before the choice existed", () => {
    const { travel: _dropped, ...older } = emptyPlan();
    const parsed = PlanStateSchema.safeParse(older);
    expect(parsed.success && parsed.data.travel).toEqual({ mode: "together", followMonths: "" });
  });

  it("survives saving to a file and opening it", () => {
    const plan = family(TYPED, "5");
    const opened = parsePlanFile(serializePlan(plan));
    expect(opened.ok && opened.state.travel).toEqual({ mode: "follow", followMonths: "5" });
    expect(opened.ok && computePlan(opened.state).follow?.months).toBe(5);
  });

  it("survives the link to another device", () => {
    const plan = family(TYPED, "5");
    const back = expandPlan(JSON.parse(JSON.stringify(compactPlan(plan))));
    expect(back?.travel).toEqual({ mode: "follow", followMonths: "5" });
    expect(back && computePlan(back).oneTimeCents).toBe(computePlan(plan).oneTimeCents);
  });

  it("leaves a plan that travels together out of the link's small form", () => {
    expect(compactPlan(emptyPlan())["travel"]).toBeUndefined();
  });

  it("is told apart in the comparison", () => {
    expect(summarizePlan("a", family(TYPED, "5")).followMonths).toBe(5);
    expect(summarizePlan("b", emptyPlan()).followMonths).toBeNull();
  });
});

describe("the totals on the cards of the moving calculator when the family follows later", () => {
  const result = computePlan(family(TYPED, "4"));
  const total = (id: string) => {
    const group = groupsOfCalculator("moving", true).find((g) => g.id === id);
    if (!group) throw new Error(`no card ${id}`);
    return groupSubtotal(result, group).cents;
  };

  it("shows what is due at departure on the travel card, without the family's tickets", () => {
    expect(total("travel")).toBe(usd(600));
  });

  it("shows everything due at each arrival, the family's tickets with the family's arrival", () => {
    expect(total("arrivalAlone")).toBe(usd(670));
    expect(total("arrivalFamily")).toBe(usd(2620));
  });

  it("adds the cards up to the moving money that is due before the months alone", () => {
    expect(total("travel") + total("arrivalAlone") + total("arrivalFamily")).toBe(usd(600 + 670 + 2620));
  });
});
