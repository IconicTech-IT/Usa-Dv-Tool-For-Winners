import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { coverageOf, MAX_COVERED_MONTHS } from "@/lib/calc/coverage";
import { ITEMS, QUICK_ITEMS } from "@/lib/calc/catalog";
import { computePlan } from "@/lib/calc/compute";
import { emptyField, emptyPlan, REGISTRATION_FEE_ITEM, type PlanState } from "@/lib/calc/model";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

/**
 * Owner rule (2026-10-19): everything is plain. Everyday words; no English or technical term alone (the
 * Arabic meaning first, the English in brackets); no jargon; every money item says what it is, when you
 * pay it, whether it comes back and who it counts; every result has a plain sentence.
 */

const ROOT = process.cwd();

/** Every text of a JSON value with its path; links and the kind of block are not text for a reader. */
function texts(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, i) => texts(item, `${path}[${i}]`));
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    key === "url" || key === "type" || key === "ordered" ? [] : texts(child, path ? `${path}.${key}` : key),
  );
}

function json(file: string): unknown {
  return JSON.parse(readFileSync(join(ROOT, file), "utf8"));
}

/** The Arabic texts a reader meets, with the file each comes from. */
function arabicTexts(): [string, string][] {
  const notes = json("content/item-notes.json") as {
    notes: Record<string, { ar: string }>;
    sources: Record<string, { ar: string }>;
  };
  const links = json("content/guide-links.json") as {
    sites: Record<string, { what: { ar: string }; watch?: { ar: string } }>;
  };
  const pages = ["about", "charge", "privacy"].flatMap((name) =>
    texts((json(`content/pages/${name}.json`) as { ar: unknown }).ar, `pages/${name}`),
  );
  return [
    ...texts(ar, "messages"),
    ...pages,
    ...Object.entries(notes.notes).map(([id, note]): [string, string] => [`notes.${id}`, note.ar]),
    ...Object.entries(notes.sources).map(([id, source]): [string, string] => [`sources.${id}`, source.ar]),
    ...Object.entries(links.sites).flatMap(([id, site]): [string, string][] => [
      [`site.${id}.what`, site.what.ar],
      ...(site.watch ? ([[`site.${id}.watch`, site.watch.ar]] as [string, string][]) : []),
    ]),
  ];
}

const ARABIC_LETTER = /[ء-ي]/;
/** The only messages that may have no Arabic letter: the name of the site and the name of the other language. */
const NO_ARABIC_NEEDED = [
  "messages.header.brand",
  "messages.header.otherLanguage",
  "messages.header.switchLanguage",
];

/**
 * English words that may stand outside brackets in Arabic text: the name of the site and of a few official
 * things people know by their letters, and the forms and laws the public-charge page quotes.
 */
const NAMES = new Set([
  "English",
  "DV",
  "Compass",
  "USCIS",
  "DHS",
  "PDF",
  "QR",
  "JPEG",
  "EN",
  "HealthCare.gov",
  "gov",
  "FAM",
  "CFR",
  "Facebook",
  "Marketplace",
]);
const NAME_PATTERNS = [/^I-\d+[A-Z]?$/, /^DV-\d{4}$/, /^DHS\/USCIS$/];

/** The text without its message syntax, its bracketed parts, its links and its e-mail addresses. */
function withoutAllowedParts(text: string): string {
  let plain = text;
  for (let previous = ""; previous !== plain;) {
    previous = plain;
    plain = plain.replace(/\{[^{}]*\}/g, " ");
  }
  for (let previous = ""; previous !== plain;) {
    previous = plain;
    plain = plain.replace(/\([^()]*\)/g, " ");
  }
  return plain.replace(/https?:\/\/\S+/g, " ").replace(/\S+@\S+/g, " ");
}

describe("no label is English only", () => {
  it("has an Arabic letter in every Arabic message, except the name of the site and the other language", () => {
    const missing = texts(ar, "messages")
      .filter(([path]) => !NO_ARABIC_NEEDED.includes(path))
      .filter(([, text]) => !ARABIC_LETTER.test(text))
      .map(([path, text]) => `${path}: ${text}`);
    expect(missing).toEqual([]);
  });

  it("names every item, group, stage and scenario in Arabic", () => {
    const labels = [
      ...Object.values(ar.calc.items),
      ...Object.values(ar.calc.groups),
      ...Object.values(ar.calc.groupHints),
      ...Object.values(ar.calc.stages),
      ...Object.values(ar.calc.scenarios),
      ...Object.values(ar.calc.scenarioHints),
      ...Object.values(ar.calc.scaling),
    ];
    for (const label of labels) expect(label, label).toMatch(ARABIC_LETTER);
  });

  it("leaves no English word alone in the Arabic text: it is in brackets, or it is a name people know", () => {
    const alone: string[] = [];
    for (const [path, text] of arabicTexts()) {
      for (const match of withoutAllowedParts(text).matchAll(/[A-Za-z][A-Za-z0-9.\-+/]*/g)) {
        const word = match[0].replace(/\.+$/, "");
        if (!NAMES.has(word) && !NAME_PATTERNS.some((pattern) => pattern.test(word)))
          alone.push(`${path}: ${word}`);
      }
    }
    expect(alone).toEqual([]);
  });
});

describe("no jargon", () => {
  const JARGON = [/runway/i, /scenario/i, /سيناريو/, /برومبت/, /بروميت/, /ISO 4217/, /البابليك تشارج/];

  it("uses none of the words that need a lesson, in the messages or the pages, in either language", () => {
    const pages = readdirSync(join(ROOT, "content", "pages"))
      .filter((name) => name !== "english-prompt.json")
      .flatMap((name) => texts(json(`content/pages/${name}`), `pages/${name}`));
    const found = [...texts(ar, "ar"), ...texts(en, "en"), ...pages]
      .filter(([, text]) => JARGON.some((word) => word.test(text)))
      .map(([path, text]) => `${path}: ${text.slice(0, 60)}`);
    expect(found).toEqual([]);
  });

  it("names the months page by its question, and the job cards by what they say", () => {
    expect(ar.runway.title).toBe("فلوسك تكفي كام شهر؟");
    expect(ar.calc.scenarios.start2).toBe("لو لقيت شغل بعد شهرين");
    expect(en.runway.title).toBe("How many months does your money last?");
    expect(en.calc.scenarios.start2).toBe("If you find a job after 2 months");
  });
});

describe("every money box says what it is, when you pay, whether it comes back and who it counts", () => {
  const lines = ar.calc.itemIncludes as Record<string, string>;
  const english = en.calc.itemIncludes as Record<string, string>;
  const ids = [...ITEMS, ...QUICK_ITEMS].map((item) => item.id);

  it("has a line for every box, in both languages", () => {
    expect(Object.keys(lines).sort()).toEqual([...ids].sort());
    expect(Object.keys(english).sort()).toEqual([...ids].sort());
  });

  it("says when you pay it", () => {
    for (const id of ids) expect(lines[id], id).toMatch(/بتدفع|بتشتري|اتدفع|وقت|قبل|بعد|أول|كل شهر|لما/);
    for (const id of ids)
      expect(english[id], id).toMatch(/pay|buy|before|after|when|first|every month|around/i);
  });

  it("says who it counts", () => {
    for (const id of ids) {
      expect(lines[id], id).toMatch(/لكل|للأسرة|للشقة|للعربية|للمتقدم|للكبار|لعربية|مجموع|لفرد|لشخص/);
      expect(english[id], id).toMatch(
        /for each|for the|for one|for adults|per |type the total|for every|one person/i,
      );
    }
  });

  it("says whether it comes back, or that the source does not say", () => {
    // The official registration fee and the green card fee: the sources used here do not say.
    const sourceSilent = ["registrationFee", "immigrantFee"];
    for (const id of ids.filter((box) => !sourceSilent.includes(box))) {
      expect(lines[id], id).toMatch(/مش بي?رجع|مش بترجع|بيرجعلك|بيرجع|اسأل|مجاني|غالبًا مش/);
      expect(english[id], id).toMatch(/does not come back|comes back|ask|free|usually does not/i);
    }
  });

  it("says that the interview fee does not come back even if the visa is refused, and the deposit does come back", () => {
    expect(lines["visaFee"]).toContain("مش بيرجع حتى لو الفيزا اترفضت");
    expect(english["visaFee"]).toContain("does not come back even if the visa is refused");
    expect(lines["securityDeposit"]).toContain("بيرجعلك لما تسيب الشقة");
    expect(english["securityDeposit"]).toContain("comes back when you leave");
  });
});

describe("buttons say what happens", () => {
  it("has plain words on the buttons that save, send, print, add and delete", () => {
    expect(ar.print.button).toBe("اطبع الخطة / PDF");
    expect(ar.results.savePlan).toBe("احفظ الخطة على جهازك (ملف)");
    expect(ar.results.openPlan).toBe("افتح خطة كنت حفظتها");
    expect(ar.results.whatsapp).toBe("ابعت الملخص على واتساب");
    expect(ar.results.reset).toBe("امسح أرقام الخطة وابدأ من جديد");
    expect(ar.transfer.open).toBe("ابعت الخطة لجهاز تاني");
    expect(ar.transfer.add).toBe("ضيف الخطة لخططي");
    expect(ar.plans.delete).toBe("امسح الخطة");
    expect(ar.plans.duplicate).toBe("اعمل نسخة منها");
    expect(en.results.savePlan).toBe("Save the plan on your device (a file)");
    expect(en.transfer.open).toBe("Send the plan to another device");
    expect(en.plans.delete).toBe("Delete the plan");
  });
});

describe("the sentence about the savings", () => {
  const usd = (dollars: number) => BigInt(dollars) * 100n;
  const base = {
    savingsTyped: true,
    savingsCents: usd(20000),
    oneTimeCents: usd(5000),
    monthlyCents: usd(2000),
    phases: null,
  };

  it("says how many months the savings last after the costs paid once", () => {
    expect(coverageOf(base)).toEqual({ kind: "months", months: 7 });
  });

  it("says how much is still to save when the savings do not cover the costs paid once", () => {
    expect(coverageOf({ ...base, savingsCents: usd(1000) })).toEqual({
      kind: "short",
      shortCents: usd(4000),
    });
  });

  it("says less than a month when only the costs paid once are covered", () => {
    expect(coverageOf({ ...base, savingsCents: usd(5500) })).toEqual({ kind: "months", months: 0 });
  });

  it("says nothing until the savings are typed, or when there is no monthly cost to count", () => {
    expect(coverageOf({ ...base, savingsTyped: false })).toBeNull();
    expect(coverageOf({ ...base, monthlyCents: 0n })).toBeNull();
  });

  it("counts the months alone at their own cost and the family's months after, when the family follows later", () => {
    const phases = { months: 2, aloneMonthlyCents: usd(500), fullMonthlyCents: usd(1500) };
    // 1000 for the two months alone, then 1500 a month: 3000 - 1000 = 2000 buys one more month
    expect(coverageOf({ ...base, savingsCents: usd(8000), oneTimeCents: usd(5000), phases })).toEqual({
      kind: "months",
      months: 3,
    });
    // not even the two months alone
    expect(coverageOf({ ...base, savingsCents: usd(5400), oneTimeCents: usd(5000), phases })).toEqual({
      kind: "months",
      months: 0,
    });
  });

  it("never says more than a cap, so a tiny cost does not give a silly number", () => {
    expect(coverageOf({ ...base, monthlyCents: 1n })).toEqual({ kind: "months", months: MAX_COVERED_MONTHS });
  });

  it("is part of every result a person sees, with its sentences in both languages", () => {
    const plan: PlanState = emptyPlan();
    plan.items[REGISTRATION_FEE_ITEM] = emptyField();
    plan.items["rent"] = { raw: "1000", currency: "usd" };
    plan.savings = { raw: "10000", currency: "usd" };
    expect(computePlan(plan).coverage).toEqual({ kind: "months", months: 10 });
    expect(computePlan(emptyPlan()).coverage).toBeNull();
    for (const messages of [ar, en]) {
      for (const key of ["coverMonths", "coverShort", "coverUnderMonth"] as const) {
        expect(messages.runway[key].length, key).toBeGreaterThan(10);
      }
    }
    expect(ar.runway.coverMonths).toContain("فلوسك اللي معاك تكفيك حوالي");
    expect(en.runway.coverMonths).toContain("Your savings last about");
  });
});
