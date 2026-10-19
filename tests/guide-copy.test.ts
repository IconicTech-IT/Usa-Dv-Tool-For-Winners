import { describe, expect, it } from "vitest";

import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { CALCULATOR_PATH } from "@/lib/calc/routes";
import { guideKind, guideText, type Translate } from "@/lib/guide/copy";
import { GUIDE_ITEM_IDS, guideSitesFor } from "@/lib/guide/links";

/** A translate function over a messages file: dotted keys, {name} placeholders, throws on a missing key. */
function translator(messages: unknown): Translate {
  return (key, values = {}) => {
    let node: unknown = messages;
    for (const part of key.split(".")) {
      if (typeof node !== "object" || node === null || !(part in node))
        throw new Error(`missing message ${key}`);
      node = (node as Record<string, unknown>)[part];
    }
    if (typeof node !== "string") throw new Error(`message ${key} is not text`);
    return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), node);
  };
}

describe("guide copy", () => {
  it("has a title, a lead and three steps in both languages for every guide page", () => {
    for (const messages of [ar, en]) {
      const t = translator(messages);
      for (const id of GUIDE_ITEM_IDS) {
        const text = guideText(t, id);
        expect(text.title.trim().length, id).toBeGreaterThan(0);
        expect(text.lead.trim().length, id).toBeGreaterThan(0);
        expect(text.steps, id).toHaveLength(3);
        expect(text.title, id).not.toContain("{item}");
      }
    }
  });

  it("names the item in the title of a general guide", () => {
    const t = translator(ar);
    expect(guideText(t, "passport").title).toContain("استخراج أو تجديد الباسبور");
  });

  it("gives food and health their own wording", () => {
    expect(guideKind("food")).toBe("food");
    expect(guideKind("healthInsurance")).toBe("health");
    expect(guideKind("healthInsuranceStart")).toBe("health");
    expect(guideKind("rent")).toBe("generic");
  });

  it("sends every calculator back to its own page", () => {
    expect(CALCULATOR_PATH).toEqual({ fees: "/fees", moving: "/moving", monthly: "/runway" });
  });
});

describe("health guide", () => {
  it("links to HealthCare.gov only: no Medicaid and no CHIP (public-charge risk, waiting periods)", () => {
    for (const id of ["healthInsurance", "healthInsuranceStart"]) {
      for (const site of guideSitesFor(id)) {
        expect(site.url, `${id}: ${site.id}`).toMatch(/^https:\/\/www\.healthcare\.gov\//);
      }
    }
  });

  it("does not point people to Medicaid or CHIP in its steps", () => {
    for (const messages of [ar, en]) {
      const text = guideText(translator(messages), "healthInsurance");
      for (const part of [text.title, text.lead, ...text.steps]) {
        expect(part).not.toMatch(/medicaid|chip/i);
      }
    }
  });

  it("warns that HealthCare.gov may offer a subsidy the new immigrant must not take, and links the public-charge page", () => {
    expect(ar.guideHealth.subsidyWarning).toContain("متاخدش الدعم ده");
    expect(en.guideHealth.subsidyWarning).toContain("do not take this subsidy");
    expect(ar.guideHealth.subsidyWarningLink).toContain("البابليك تشارج");
    expect(en.guideHealth.subsidyWarningLink.toLowerCase()).toContain("public charge");
  });
});
