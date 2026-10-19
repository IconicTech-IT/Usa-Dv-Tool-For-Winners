import { describe, expect, it } from "vitest";

import { findItem, ITEMS, QUICK_ITEMS, STAGES } from "@/lib/calc/catalog";

/** What the approved design (v10) says about each item. A change here is a design change. */

function scalingOf(id: string): string | undefined {
  return findItem(id)?.scaling;
}

describe("catalog follows the approved design", () => {
  it("scales these items by every person in the household", () => {
    for (const id of [
      "entryPhotos",
      "medicalExam",
      "policeCertificate",
      "visaPhotos",
      "visaFee",
      "passportCourier",
      "immigrantFee",
      "ticket",
      "winterClothes",
      "licenseTests",
      "food",
    ]) {
      expect(scalingOf(id), id).toBe("perPerson");
    }
  });

  it("scales childcare by the number of children, in the first month and every month", () => {
    expect(scalingOf("childcareStart")).toBe("perChild");
    expect(scalingOf("childcare")).toBe("perChild");
  });

  it("lets the user switch health and travel insurance between the household and each person", () => {
    const toggles = ITEMS.filter((item) => item.toggle).map((item) => item.id);
    expect(toggles.sort()).toEqual(["healthInsurance", "healthInsuranceStart", "travelInsurance"]);
  });

  it("keeps ticket, extra baggage and travel insurance in the moving calculator", () => {
    for (const id of ["ticket", "excessBaggage", "travelInsurance"]) {
      expect(findItem(id)?.calculator, id).toBe("moving");
    }
  });

  it("has separate entry photos and visa photos, and the entry help", () => {
    expect(findItem("entryPhotos")?.stage).toBe("beforeInterview");
    expect(findItem("visaPhotos")?.stage).toBe("beforeInterview");
    expect(findItem("entryHelp")).toBeDefined();
    expect(findItem("photos")).toBeUndefined();
  });

  it("puts the passport courier in the interview group, due before travel", () => {
    const courier = findItem("passportCourier");
    expect(courier?.group).toBe("interview");
    expect(courier?.stage).toBe("beforeTravel");
  });

  it("offers five quick boxes: paperwork, travel, housing, car, one month of costs", () => {
    expect(QUICK_ITEMS.map((item) => item.id)).toEqual([
      "quickPaperwork",
      "quickTravel",
      "quickHousing",
      "quickCar",
      "quickMonthly",
    ]);
  });
});

describe("catalog is consistent", () => {
  it("has unique ids across detailed and quick items", () => {
    const ids = [...ITEMS, ...QUICK_ITEMS].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has items in every due stage, in a known order", () => {
    for (const stage of STAGES) {
      expect(
        ITEMS.some((item) => item.stage === stage),
        stage,
      ).toBe(true);
    }
  });

  it("uses the monthly stage for the monthly calculator and for nothing else", () => {
    for (const item of [...ITEMS, ...QUICK_ITEMS]) {
      expect(item.calculator === "monthly", item.id).toBe(item.stage === "monthly");
    }
  });
});
