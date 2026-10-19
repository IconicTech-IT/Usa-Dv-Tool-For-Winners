import { describe, expect, it } from "vitest";

import { findItem } from "@/lib/calc/catalog";
import {
  emptyPlan,
  MAX_REGISTRATIONS,
  PlanStateSchema,
  REGISTRATION_FEE_ITEM,
  REGISTRATION_FEE_PREFILL,
} from "@/lib/calc/model";
import { setRegistrations } from "@/lib/calc/plan-actions";
import { parsePlanFile, serializePlan } from "@/lib/calc/plan-file";
import { guideSitesFor } from "@/lib/guide/links";
import { NOTE_INDEX, noteById, notesForItem } from "@/lib/guide/notes";

describe("the one prefilled amount", () => {
  it("is the official registration fee, in dollars, and nothing else", () => {
    const plan = emptyPlan();
    const prefilled = [
      ...Object.entries(plan.items),
      ...Object.entries(plan.quick),
      ["income", plan.income] as const,
      ["spouseIncome", plan.spouseIncome] as const,
      ["savings", plan.savings] as const,
    ].filter(([, field]) => field.raw !== "");
    expect(prefilled).toEqual([[REGISTRATION_FEE_ITEM, { raw: REGISTRATION_FEE_PREFILL, currency: "usd" }]]);
    expect(plan.bufferMonths).toBe("");
    expect(plan.rate).toBe("");
  });

  it("can be changed by the user, and a changed value survives saving and opening", () => {
    const plan = emptyPlan();
    plan.items[REGISTRATION_FEE_ITEM] = { raw: "2", currency: "usd" };
    const opened = parsePlanFile(serializePlan(plan));
    expect(opened.ok && opened.state.items[REGISTRATION_FEE_ITEM]?.raw).toBe("2");
  });

  it("is put back for a saved plan that lacks the box, not left empty", () => {
    const old = emptyPlan();
    const items = { ...old.items };
    delete items[REGISTRATION_FEE_ITEM];
    const opened = parsePlanFile(serializePlan({ ...old, items }));
    expect(opened.ok && opened.state.items[REGISTRATION_FEE_ITEM]?.raw).toBe(REGISTRATION_FEE_PREFILL);
  });
});

describe("the number of entries", () => {
  it("starts at one, is kept between 1 and the limit, and ignores nonsense", () => {
    const plan = emptyPlan();
    expect(plan.registrations).toBe(1);
    expect(setRegistrations(plan, 2).registrations).toBe(2);
    expect(setRegistrations(plan, 0).registrations).toBe(1);
    expect(setRegistrations(plan, 999).registrations).toBe(MAX_REGISTRATIONS);
    expect(setRegistrations(plan, Number.NaN)).toBe(plan);
    expect(setRegistrations(plan, 1)).toBe(plan);
  });

  it("is one for a plan saved before the setting existed", () => {
    const { registrations: _dropped, ...older } = emptyPlan();
    const parsed = PlanStateSchema.safeParse(older);
    expect(parsed.success && parsed.data.registrations).toBe(1);
  });
});

describe("official notes on the guide pages", () => {
  it("only point at notes, sources and items that exist", () => {
    for (const [itemId, ids] of Object.entries(NOTE_INDEX.byItem)) {
      expect(findItem(itemId), itemId).toBeDefined();
      for (const id of ids) expect(noteById(id, "ar"), `${itemId} -> ${id}`).not.toBeNull();
    }
    for (const id of NOTE_INDEX.notes) {
      expect(noteById(id, "en"), id).not.toBeNull();
    }
  });

  it("gives every note a source with a secure address, in both languages", () => {
    for (const locale of ["ar", "en"] as const) {
      for (const id of NOTE_INDEX.notes) {
        const note = noteById(id, locale);
        expect(note?.source.url.startsWith("https://"), id).toBe(true);
        expect(note?.source.label.length, id).toBeGreaterThan(0);
        expect(note?.text.length, id).toBeGreaterThan(20);
      }
    }
  });

  it("states the passport rule as valid and not expired, with no six-month rule", () => {
    const rule = noteById("passportAtRegistration", "ar")?.text ?? "";
    expect(rule).toContain("ساري ومش منتهي");
    expect(rule).not.toMatch(/6 شهور|ستة/);
    expect(noteById("passportAtRegistration", "en")?.text).not.toMatch(/6 months|six months/i);
  });

  it("states the passport at the interview as an official rule for every applicant: six months beyond the entry date", () => {
    const rule = noteById("passportSixMonths", "ar");
    expect(rule?.kind).toBe("rule");
    expect(rule?.text).toContain("وقت المقابلة");
    expect(rule?.text).toContain("لكل متقدم في الأسرة، كبير وطفل");
    expect(rule?.source.url).toContain("CRO-Cairo.html");
    const en = noteById("passportSixMonths", "en");
    expect(en?.text).toContain("6 months beyond the date you plan to enter");
    expect(en?.text).toContain("every applicant in the family, adult or child");
    expect(en?.text).toContain("At registration it only has to be valid and not expired");
    const sixMonthNotes = NOTE_INDEX.notes.filter((id) => noteById(id, "ar")?.text.includes("6 شهور"));
    // Two rules carry the number: the passport at the interview and the age of the photos.
    expect(sixMonthNotes.sort()).toEqual(["passportSixMonths", "photosSixMonths"]);
    expect(noteById("photosSixMonths", "ar")?.kind).toBe("rule");
    // The family's passports show the same rule.
    expect(notesForItem("familyPassports", "ar").map((n) => n.id)).toEqual([
      "familyPassports",
      "passportSixMonths",
    ]);
  });

  it("says leaving out a spouse or child will result in the denial, not that it may", () => {
    const denial = noteById("familyListingDenial", "en");
    expect(denial?.kind).toBe("rule");
    expect(denial?.text).toContain("will result in the denial of your visa and your family's visas");
    expect(denial?.text).toContain("nonrefundable");
    expect(denial?.text).toContain("should not proceed");
    expect(denial?.source.url).toContain("CRO-Cairo.html");
    const arabic = noteById("familyListingDenial", "ar")?.text ?? "";
    expect(arabic).toContain("هيتسبب في رفض فيزتك وفيزات أسرتك كلها");
    expect(arabic).toContain("مش بترجع");
    // Neither language softens it any more.
    for (const language of ["ar", "en"] as const) {
      expect(noteById("familyListing", language)?.text).not.toMatch(
        /ممكن يخليك غير مؤهل|may make you ineligible/,
      );
      expect(noteById("familyListingDenial", language)?.text).not.toMatch(/ممكن|\bmay\b/);
    }
    expect(notesForItem("entryPhotos", "en").map((n) => n.id)).toContain("familyListingDenial");
  });

  it("says the X-ray and blood tests start at 15, for the adults' box and the children's box", () => {
    const en = noteById("medicalAge15", "en");
    expect(en?.kind).toBe("rule");
    expect(en?.text).toContain("not required of people under 15");
    expect(en?.source.url).toContain("CRO-Cairo.html");
    expect(noteById("medicalAge15", "ar")?.text).toContain("15 سنة");
  });

  it("says the USCIS fee is strongly encouraged before travel, not required", () => {
    const en = noteById("immigrantFee", "en")?.text ?? "";
    expect(en).toContain("strongly encouraged");
    expect(en).not.toMatch(/must pay/i);
  });

  it("says the green card fee is paid online after the visa, before travel, for each person", () => {
    const en = noteById("immigrantFee", "en")?.text ?? "";
    expect(en).toContain("after the visa is issued");
    expect(en).toContain("producing your green card");
    expect(en).toContain("each person");
    expect(noteById("immigrantFee", "ar")?.text).toContain("كل شخص");
    expect(noteById("immigrantFee", "en")?.source.url).toBe(
      "https://www.uscis.gov/forms/filing-fees/uscis-immigrant-fee",
    );
  });

  it("says the interview fee is paid at the embassy on the interview day, for each applicant, and is not refunded", () => {
    const [note] = notesForItem("visaFee", "en");
    expect(note?.kind).toBe("rule");
    expect(note?.text).toContain("on the interview day");
    expect(note?.text).toContain("each applicant");
    expect(note?.text).toContain("non-refundable");
    expect(note?.source.url).toBe(
      "https://travel.state.gov/content/travel/en/us-visas/Supplements/Supplements_by_Post/CRO-Cairo.html",
    );
    expect(notesForItem("visaFee", "ar")[0]?.text).toContain("غير قابلة للاسترداد");
  });

  it("ties the visa's expiry to the medical exam, not to the day the visa is issued", () => {
    const en = noteById("visaExpiry", "en");
    expect(en?.kind).toBe("rule");
    expect(en?.text).toContain("usually follows the medical exam");
    expect(en?.text).toContain("before, or at the same time as");
    expect(en?.text).toContain("check the date printed on your visa");
    expect(en?.text).not.toMatch(/after it is printed|from the date of printing/);
    expect(noteById("visaExpiry", "ar")?.text).toContain("الكشف الطبي");
    expect(en?.source.url).toBe(
      "https://travel.state.gov/content/travel/en/us-visas/Supplements/Supplements_by_Post/CRO-Cairo.html",
    );
  });

  it("shows the passport, photos and medical notes on those items' guides", () => {
    expect(notesForItem("passport", "ar").map((n) => n.id)).toEqual([
      "passportAtRegistration",
      "passportExemptions",
      "passportSixMonths",
    ]);
    expect(notesForItem("medicalExam", "ar").map((n) => n.id)).toEqual(["panelPhysician", "medicalAge15"]);
    expect(notesForItem("medicalExamChild", "ar").map((n) => n.id)).toEqual([
      "panelPhysician",
      "medicalAge15",
    ]);
    expect(notesForItem("rent", "ar")).toEqual([]);
  });

  it("points the medical exam at the embassy page that lists the approved doctors", () => {
    expect(guideSitesFor("medicalExam").some((site) => site.id === "usCairoIvInstructions")).toBe(true);
  });
});
