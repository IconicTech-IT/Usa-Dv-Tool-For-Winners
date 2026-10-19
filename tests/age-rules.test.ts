import { describe, expect, it } from "vitest";

import { ageGroups, parseAge } from "@/lib/calc/ages";
import { computePlan } from "@/lib/calc/compute";
import { emptyField, emptyPlan, REGISTRATION_FEE_ITEM, type PlanState } from "@/lib/calc/model";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

function usd(dollars: number): bigint {
  return BigInt(dollars) * 100n;
}

/** A household of `adults` adults and children of these ages; "" is a child with no age typed yet. */
function household(adults: number, ages: string[], typed: Record<string, string> = {}): PlanState {
  const plan = emptyPlan();
  plan.items[REGISTRATION_FEE_ITEM] = emptyField();
  plan.household = { adults, children: ages.length, childAges: ages };
  for (const [id, raw] of Object.entries(typed)) plan.items[id] = { raw, currency: "usd" };
  return plan;
}

function item(plan: PlanState, id: string) {
  const found = computePlan(plan).items.find((i) => i.id === id);
  if (!found) throw new Error(`no result for ${id}`);
  return found;
}

describe("a child's age", () => {
  it("is read from whole numbers 0 to 20, Arabic digits included, and from nothing else", () => {
    expect(parseAge("7")).toBe(7);
    expect(parseAge("٣")).toBe(3);
    expect(parseAge("0")).toBe(0);
    expect(parseAge("20")).toBe(20);
    for (const raw of ["", " ", "21", "-1", "2.5", "abc"]) expect(parseAge(raw), raw).toBeNull();
  });

  it("falls in the groups where the rules change, at each edge", () => {
    const groups = ageGroups(["1", "2", "11", "12", "14", "15", "16", "4", "5"], 9);
    expect(groups.infants).toBe(1); // 1: under two
    expect(groups.childFare).toBe(4); // 2, 11, 4, 5
    expect(groups.adultFare).toBe(4); // 12, 14, 15, 16
    expect(groups.under15).toBe(7); // 1, 2, 11, 12, 14, 4, 5
    expect(groups.from15).toBe(2); // 15, 16
    expect(groups.from16).toBe(1); // 16
    expect(groups.underSchool).toBe(3); // 1, 2, 4
    expect(groups.unknown).toBe(0);
  });

  it("counts a child with no age as a small child, and not as 16 or older", () => {
    const groups = ageGroups(["", "9"], 2);
    expect(groups).toMatchObject({
      unknown: 1,
      childFare: 2,
      under15: 2,
      underSchool: 1,
      from16: 0,
      infants: 0,
    });
    // a plan saved before ages were asked has fewer ages than children
    expect(ageGroups([], 2)).toMatchObject({ unknown: 2, childFare: 2, from16: 0 });
  });
});

describe("the police certificate", () => {
  it("counts the applicant, the spouse and the children of 16 or older, not the younger ones", () => {
    const plan = household(2, ["7", "16", "18"], { policeCertificate: "10" });
    expect(item(plan, "policeCertificate")).toMatchObject({ multiplier: 4, cents: usd(40) });
    expect(item(household(1, ["15"], { policeCertificate: "10" }), "policeCertificate").multiplier).toBe(1);
    expect(item(household(2, [], { policeCertificate: "10" }), "policeCertificate").multiplier).toBe(2);
  });

  it("does not count a child whose age is not typed yet", () => {
    expect(item(household(2, [""], { policeCertificate: "10" }), "policeCertificate").multiplier).toBe(2);
  });
});

describe("the driving licence tests", () => {
  it("count the adults only, never a teenager or a child", () => {
    const plan = household(2, ["16", "9"], { licenseTests: "50" });
    expect(item(plan, "licenseTests")).toMatchObject({ multiplier: 2, cents: usd(100) });
  });
});

describe("childcare", () => {
  it("counts the children under school age, in the first month and every month", () => {
    const plan = household(1, ["1", "4", "5", "9"], { childcareStart: "300", childcare: "100" });
    expect(item(plan, "childcareStart")).toMatchObject({ multiplier: 2, cents: usd(600) });
    expect(item(plan, "childcare")).toMatchObject({ multiplier: 2, cents: usd(200) });
  });

  it("is hidden when no child is of that age, but still holds what was typed", () => {
    const plan = household(2, ["9", "13"], { childcare: "100" });
    expect(item(plan, "childcare")).toMatchObject({ applicable: false, cents: null });
    expect(plan.items["childcare"]?.raw).toBe("100");
  });

  it("says in its line that the age is our analysis, not a rule", () => {
    expect(ar.calc.itemIncludes.childcare).toContain("تحليل");
    expect(ar.calc.itemIncludes.childcareStart).toContain("تحليل");
    expect(en.calc.itemIncludes.childcare).toContain("our analysis");
    expect(en.calc.itemIncludes.childcareStart).toContain("our analysis");
  });
});

describe("the medical exam", () => {
  it("has two boxes: the adults and anyone 15 or older, and the children under 15", () => {
    const plan = household(2, ["3", "14", "15", "17"], { medicalExam: "100", medicalExamChild: "40" });
    expect(item(plan, "medicalExam")).toMatchObject({ multiplier: 4, cents: usd(400) }); // 2 adults + 15 + 17
    expect(item(plan, "medicalExamChild")).toMatchObject({ multiplier: 2, cents: usd(80) }); // 3 and 14
  });

  it("counts everyone once between the two boxes, whatever the ages", () => {
    for (const ages of [["1"], ["1", "15"], ["", "20", "7"], []]) {
      const plan = household(2, ages, { medicalExam: "1", medicalExamChild: "1" });
      const total =
        item(plan, "medicalExam").multiplier +
        (item(plan, "medicalExamChild").applicable ? item(plan, "medicalExamChild").multiplier : 0);
      expect(total, ages.join(",")).toBe(2 + ages.length);
    }
  });

  it("hides the children's box when no child is under 15", () => {
    expect(item(household(2, ["16"]), "medicalExamChild").applicable).toBe(false);
    expect(item(household(2, []), "medicalExamChild").applicable).toBe(false);
    expect(item(household(2, ["14"]), "medicalExamChild").applicable).toBe(true);
  });

  it("names the two boxes by who they are for, in both languages", () => {
    expect(ar.calc.items.medicalExam).toBe("الكشف الطبي: للكبار وأي حد 15 سنة أو أكبر");
    expect(ar.calc.items.medicalExamChild).toBe("الكشف الطبي: للأطفال أقل من 15 سنة");
    expect(en.calc.items.medicalExam).toBe("Medical exam: adults and anyone 15 or older");
    expect(en.calc.items.medicalExamChild).toBe("Medical exam: children under 15");
  });
});

describe("the flight tickets", () => {
  it("have three boxes, each counted for its own group: adults from 12, children 2 to 11, infants under 2", () => {
    const plan = household(2, ["1", "6", "12", "16"], {
      ticket: "600",
      ticketChild: "400",
      ticketInfant: "100",
    });
    expect(item(plan, "ticket")).toMatchObject({ multiplier: 4, cents: usd(2400) }); // 2 adults + 12 + 16
    expect(item(plan, "ticketChild")).toMatchObject({ multiplier: 1, cents: usd(400) });
    expect(item(plan, "ticketInfant")).toMatchObject({ multiplier: 1, cents: usd(100) });
  });

  it("show a box only when someone is in that group", () => {
    const adultsOnly = household(2, []);
    expect(item(adultsOnly, "ticketChild").applicable).toBe(false);
    expect(item(adultsOnly, "ticketInfant").applicable).toBe(false);
    const withBaby = household(2, ["0"]);
    expect(item(withBaby, "ticketInfant").applicable).toBe(true);
    expect(item(withBaby, "ticketChild").applicable).toBe(false);
  });

  it("name the groups the way the user asked, and say the airline pattern is unconfirmed", () => {
    expect(ar.calc.items.ticket).toContain("كبير");
    expect(ar.calc.items.ticketChild).toBe("تذكرة الطيران: طفل من 2 لـ11 سنة");
    expect(ar.calc.items.ticketInfant).toBe("تذكرة الطيران: رضيع أقل من سنتين");
    for (const id of ["ticket", "ticketChild", "ticketInfant"]) {
      expect(ar.calc.itemIncludes[id as "ticket"], id).toContain("غير مؤكد");
      expect(en.calc.itemIncludes[id as "ticket"], id).toContain("unconfirmed");
    }
  });

  it("split when the principal goes first: his adult ticket at departure, the family's three groups later", () => {
    const plan = household(2, ["1", "6"], { ticket: "600", ticketChild: "400", ticketInfant: "100" });
    plan.travel = { mode: "follow", followMonths: "3" };
    const result = computePlan(plan);
    const stage = (id: string, name: string) =>
      result.items.find((i) => i.id === id)?.parts.find((p) => p.stage === name)?.cents;
    expect(stage("ticket", "beforeTravel")).toBe(usd(600)); // the principal
    expect(stage("ticket", "familyArrival")).toBe(usd(600)); // the spouse, an adult
    expect(stage("ticketChild", "familyArrival")).toBe(usd(400));
    expect(stage("ticketInfant", "familyArrival")).toBe(usd(100));
    expect(stage("ticketChild", "beforeTravel")).toBeUndefined();
  });
});

describe("what counts everyone, whatever the age", () => {
  it("counts the photos for the interview, the interview fee and the green card fee for every person", () => {
    const plan = household(2, ["1", "9", "16"], { visaPhotos: "1", visaFee: "2", immigrantFee: "3" });
    for (const id of ["visaPhotos", "visaFee", "immigrantFee"]) expect(item(plan, id).multiplier, id).toBe(5);
  });

  it("counts the entry photos for everyone on the entry, the baby too", () => {
    expect(item(household(2, ["0", "9"], { entryPhotos: "1" }), "entryPhotos").multiplier).toBe(4);
  });
});

describe("the passport courier", () => {
  it("says it is free at the Cairo embassy, so nobody types a price for it by mistake", () => {
    expect(ar.calc.itemIncludes.passportCourier).toContain("مجاني في سفارة القاهرة");
    expect(en.calc.itemIncludes.passportCourier).toContain("free at the Cairo embassy");
  });
});

describe("a plan saved before ages were asked", () => {
  it("keeps working: children without an age count as small children, and the result says how many", () => {
    const plan = household(2, ["", ""], { ticketChild: "400", medicalExamChild: "40", childcare: "100" });
    const result = computePlan(plan);
    expect(result.agesUnknown).toBe(2);
    expect(item(plan, "ticketChild").multiplier).toBe(2);
    expect(item(plan, "medicalExamChild").multiplier).toBe(2);
    expect(item(plan, "childcare").multiplier).toBe(2);
    expect(computePlan(household(2, ["3", "9"])).agesUnknown).toBe(0);
  });

  it("is nudged with one line that says what is assumed, in both languages", () => {
    expect(ar.calc.agesNudge).toContain("من غير سن");
    expect(en.calc.agesNudge).toContain("no age yet");
    expect(ar.setup.agesNudge).toContain("من غير سن");
  });
});
