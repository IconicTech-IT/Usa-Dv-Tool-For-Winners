import { describe, expect, it } from "vitest";

import { ALONE_MONTHLY_ITEMS, groupsOfCalculator, ITEMS } from "@/lib/calc/catalog";
import { computePlan } from "@/lib/calc/compute";
import {
  emptyField,
  emptyPlan,
  PlanStateSchema,
  REGISTRATION_FEE_ITEM,
  type PlanState,
} from "@/lib/calc/model";
import { patchAloneMonthly, setFollowMonths, setTravelMode } from "@/lib/calc/plan-actions";
import { normalizePlan, parsePlanFile, serializePlan } from "@/lib/calc/plan-file";
import { summarizePlan } from "@/lib/calc/compare";
import { followMonthsOf, isLateArrival } from "@/lib/calc/scaling";
import { groupSubtotal, stageSections } from "@/lib/calc/summary";
import { compactPlan, expandPlan } from "@/lib/transfer/codec";

function usd(dollars: number): bigint {
  return BigInt(dollars) * 100n;
}

/** What one person costs a month while the principal is alone (typed in the boxes of the months alone). */
const ALONE = { rent: "400", food: "100" };

/** Two adults and a child; the amounts below are whole dollars typed per box. */
function family(
  typed: Record<string, string>,
  months: string,
  alone: Record<string, string> = ALONE,
  extra: Partial<PlanState> = {},
): PlanState {
  const plan = emptyPlan();
  plan.items[REGISTRATION_FEE_ITEM] = emptyField();
  plan.household = { adults: 2, children: 1, childAges: ["4"] };
  plan.travel = { mode: "follow", followMonths: months };
  for (const [id, raw] of Object.entries(typed)) plan.items[id] = { raw, currency: "usd" };
  for (const [id, raw] of Object.entries(alone)) plan.aloneMonthly[id] = { raw, currency: "usd" };
  return { ...plan, ...extra };
}

const TYPED = {
  medicalExam: "100", // adults and anyone 15 or older, paperwork: the same for everyone
  medicalExamChild: "100", // the child of 4
  ticket: "600", // each adult
  ticketChild: "600", // the child of 4
  temporaryStay: "200", // the principal's arrival
  securityDeposit: "1000", // the family's arrival
  phoneLine: "20", // per adult
  childcareStart: "300", // per child
  winterClothes: "50", // per person
  healthInsuranceStart: "400", // whole household
  rent: "1000", // the whole family's flat, monthly (from the month after the family arrives)
  food: "100", // per person, monthly (family)
  childcare: "50", // per child, monthly (family)
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

  it("counts the months alone from their own boxes, plus the family's costs back home", () => {
    // per month alone: a room for one 400, food 100, the family back home 70: the family's flat is not counted
    const result = computePlan(plan);
    expect(result.follow?.aloneMonthlyCents).toBe(usd(400 + 100 + 70));
    expect(stageOf(plan, "aloneMonths")).toBe(usd((400 + 100 + 70) * 4));
  });

  it("counts the whole family's month after it arrives, without the family's costs back home", () => {
    expect(computePlan(plan).monthlyCents).toBe(usd(1000 + 100 * 3 + 50));
  });

  it("sums the one-time money into the total and the cash needed until the family arrives", () => {
    const result = computePlan(plan);
    const oneTime = 300 + 600 + (200 + 20 + 50 + 400) + (1200 + 1000 + 20 + 300 + 100);
    expect(result.oneTimeCents).toBe(usd(oneTime));
    expect(result.follow?.months).toBe(4);
    expect(result.follow?.cashByArrivalCents).toBe(usd(oneTime + 570 * 4));
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
    const empty = family({}, "4", {});
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
  const alone = usd(570);
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
    const plan = family({}, "4", {});
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

describe("the plan as printed: stage sections", () => {
  const follow = computePlan(family(TYPED, "4"));
  const sections = stageSections(follow);
  const rowsOf = (stage: string) => sections.find((s) => s.stage === stage)?.rows ?? [];

  it("lists each stage with the boxes that have an amount, each with how many times it counts", () => {
    expect(rowsOf("beforeInterview")).toEqual([
      { id: "medicalExam", multiplier: 2, cents: usd(200) },
      { id: "medicalExamChild", multiplier: 1, cents: usd(100) },
    ]);
    expect(rowsOf("beforeTravel")).toEqual([{ id: "ticket", multiplier: 1, cents: usd(600) }]);
    // the spouse's ticket (an adult) and the child's
    expect(rowsOf("familyArrival").find((row) => row.id === "ticket")).toEqual({
      id: "ticket",
      multiplier: 1,
      cents: usd(600),
    });
    expect(rowsOf("familyArrival").find((row) => row.id === "ticketChild")).toEqual({
      id: "ticketChild",
      multiplier: 1,
      cents: usd(600),
    });
  });

  it("carries the phases of a family that follows later, including the months alone", () => {
    expect(sections.map((s) => s.stage)).toEqual([
      "beforeInterview",
      "beforeTravel",
      "firstMonth",
      "aloneMonths",
      "familyArrival",
      "monthly",
    ]);
    expect(rowsOf("aloneMonths").map((row) => row.id)).toEqual(["rent", "food", "familyAbroadMonthly"]);
    expect(rowsOf("monthly").map((row) => row.id)).toEqual(["rent", "food", "childcare"]);
  });

  it("adds up, row by row, to the total of its stage", () => {
    for (const section of sections) {
      const sum = section.rows.reduce((total, row) => total + row.cents, 0n);
      expect(sum, section.stage).toBe(section.cents);
    }
  });

  it("leaves out the stages with nothing typed, and the phases when everyone travels together", () => {
    const together = family(TYPED, "4");
    together.travel = { mode: "together", followMonths: "" };
    const stages = stageSections(computePlan(together)).map((s) => s.stage);
    expect(stages).not.toContain("aloneMonths");
    expect(stages).not.toContain("familyArrival");
    expect(stages).not.toContain("beforeEntry");
    // a new plan holds only the official registration fee, so that is all it prints
    expect(stageSections(computePlan(emptyPlan())).map((s) => s.stage)).toEqual(["beforeEntry"]);
    expect(stageSections(computePlan(family({}, "4", {})))).toEqual([]);
  });
});

describe("the monthly boxes of the months alone", () => {
  it("are one person's costs, typed apart from the family's, and never multiplied", () => {
    const plan = family({ rent: "1000", food: "100", familyAbroadMonthly: "70" }, "4", {
      rent: "400",
      food: "100",
      transport: "30",
    });
    const result = computePlan(plan);
    // alone: 400 + 100 + 30 + 70 back home; the family's 1000 rent and 3 x 100 food are for later
    expect(result.follow?.aloneMonthlyCents).toBe(usd(400 + 100 + 30 + 70));
    expect(result.monthlyCents).toBe(usd(1000 + 300));
    const rent = result.aloneItems.find((i) => i.id === "rent");
    expect(rent).toMatchObject({ applicable: true, typed: true, multiplier: 4, cents: usd(400) });
    expect(rent?.parts).toEqual([{ stage: "aloneMonths", cents: usd(1600), multiplier: 4 }]);
  });

  it("have no box for children, and the family's costs back home are not among them", () => {
    const ids = ALONE_MONTHLY_ITEMS.map((i) => i.id);
    expect(ids).toContain("rent");
    expect(ids).not.toContain("childcare");
    expect(ids).not.toContain("familyAbroadMonthly");
    expect(Object.keys(emptyPlan().aloneMonthly).sort()).toEqual([...ids].sort());
  });

  it("are not counted when everyone travels together, but what was typed is kept", () => {
    const plan = family({ rent: "1000" }, "4");
    plan.travel = { mode: "together", followMonths: "4" };
    const result = computePlan(plan);
    expect(result.aloneItems.every((i) => !i.applicable)).toBe(true);
    expect(result.monthlyCents).toBe(usd(1000));
    expect(stageOf(plan, "aloneMonths")).toBe(0n);
    expect(plan.aloneMonthly["rent"]?.raw).toBe("400");
  });

  it("are listed as forgotten under the months alone until they are typed", () => {
    const result = computePlan(family({}, "4", {}));
    const aloneStage = result.stages.find((s) => s.stage === "aloneMonths");
    expect(aloneStage?.emptyIds).toEqual(expect.arrayContaining(["rent", "food", "familyAbroadMonthly"]));
  });

  it("can be typed in the local currency, and wait for the rate like every other box", () => {
    const plan = family({}, "4", {});
    plan.aloneMonthly["rent"] = { raw: "5000", currency: "local" };
    expect(computePlan(plan).needsRate).toBe(true);
    plan.rate = "50";
    const result = computePlan(plan);
    expect(result.needsRate).toBe(false);
    expect(result.follow?.aloneMonthlyCents).toBe(usd(100));
  });

  it("are filled in for a plan saved before they existed, and survive the file and the link", () => {
    const { aloneMonthly: _dropped, ...older } = emptyPlan();
    const parsed = PlanStateSchema.safeParse(older);
    expect(parsed.success && parsed.data.aloneMonthly).toEqual({});
    const opened = parsed.success ? normalizePlan(parsed.data) : null;
    expect(Object.keys(opened?.aloneMonthly ?? {})).toContain("rent");

    const plan = family({}, "4");
    const viaFile = parsePlanFile(serializePlan(plan));
    expect(viaFile.ok && viaFile.state.aloneMonthly["rent"]?.raw).toBe("400");
    const viaLink = expandPlan(JSON.parse(JSON.stringify(compactPlan(plan))));
    expect(viaLink?.aloneMonthly["food"]?.raw).toBe("100");
    expect(viaLink && computePlan(viaLink).follow?.aloneMonthlyCents).toBe(usd(500));
    expect(compactPlan(emptyPlan())["aloneMonthly"]).toBeUndefined();
  });

  it("change through their own action and ignore an unknown box", () => {
    const base = emptyPlan();
    const typed = patchAloneMonthly(base, "rent", { raw: "350" });
    expect(typed.aloneMonthly["rent"]?.raw).toBe("350");
    expect(patchAloneMonthly(base, "childcare", { raw: "9" })).toBe(base);
    expect(patchAloneMonthly(typed, "rent", { raw: "350" })).toBe(typed);
  });
});
