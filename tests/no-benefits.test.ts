import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

/**
 * Owner rule (2026-10-19): the site never mentions or links government assistance (food stamps and
 * the rest). The public-charge page explains the RULE and is the one place that may name benefits; the
 * health-insurance guide carries one warning (below). Everywhere else this test fails on any such term,
 * in Arabic or English, in content, messages and code.
 */

const ROOT = process.cwd();
const SCAN_DIRS = ["content", "messages", "app", "components", "lib", "public"];
const EXTENSIONS = [".json", ".ts", ".tsx", ".md", ".js", ".css"];
const IGNORE = ["node_modules", ".next"];

/** The only files that may name benefits: the rule explanation, and the file of the one allowed warning. */
const EXEMPT_FILES = [
  join("content", "pages", "charge.json"),
  join("components", "guide", "SubsidyWarning.tsx"),
];
/** The public-charge page's own text in the messages. */
const EXEMPT_MESSAGE_PREFIXES = ["charge."];

/**
 * The ONE allowed warning (owner decision): HealthCare.gov can offer a subsidy on the premium, and a
 * new immigrant must not take it. It is allowed word for word, in both languages, and nothing else is.
 */
const ALLOWED_WARNINGS: Record<string, { ar: string; en: string }> = {
  "guideHealth.subsidyWarning": {
    ar: "موقع HealthCare.gov ممكن يعرض عليك دعم (subsidy) على القسط حسب دخلك. كمهاجر جديد، متاخدش الدعم ده، واحسب السعر الكامل من غير دعم.",
    en: "HealthCare.gov may offer you a subsidy on the premium based on your income. As a new immigrant, do not take this subsidy; work out the full price without it.",
  },
};

const ARABIC_LETTER = "\\u0621-\\u064A";
const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "SNAP / food stamps / EBT", re: /\bSNAP\b|food[ -]?stamps?|\bEBT\b/i },
  { name: "WIC", re: /\bWIC\b/ },
  // CHIP is matched in capitals only: "chip" is also the name of a small label in the page styles.
  { name: "Medicaid / CHIP", re: /\b[Mm]edicaid\b|\bMEDICAID\b|\bCHIP\b/ },
  { name: "TANF / SSI", re: /\bTANF\b|\bSSI\b/ },
  {
    name: "housing assistance",
    re: /section[ -]?8\b|housing (assistance|voucher)|\bLIHEAP\b|energy assistance/i,
  },
  { name: "school meals", re: /(free|reduced)[ -](price )?(school )?(meals?|lunch)|school (meals?|lunch)/i },
  { name: "unemployment benefits", re: /unemployment (benefits?|insurance|compensation)/i },
  { name: "subsidy / ACA", re: /\bsubsid(y|ies|ized|ise|ize)\b|\bACA\b|obamacare|premium tax credit/i },
  {
    name: "welfare / benefits / aid",
    re: /\bwelfare\b|public benefits?|government (assistance|aid|benefits?)|means-tested|cash assistance|food assistance/i,
  },
  {
    name: "Arabic: support / aid",
    re: new RegExp(`(?<![${ARABIC_LETTER}])(?:ال)?دعم(?![${ARABIC_LETTER}])`),
  },
  { name: "Arabic: assistance", re: /مساعدات|مساعدة حكومية|إعانة|إعانات|اعانات/ },
  {
    name: "Arabic: food stamps / cards",
    re: /طوابع (ال)?(غذاء|طعام|أكل)|كوبونات|بطاقة تموين|ميديكيد|سناب\b/,
  },
];

/** The terms found in a piece of text, by pattern name. */
export function findBenefitTerms(text: string): string[] {
  return PATTERNS.filter((p) => p.re.test(text)).map((p) => p.name);
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (IGNORE.includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTENSIONS.some((e) => name.endsWith(e))) out.push(full);
  }
}

function filesToScan(): string[] {
  const out: string[] = [];
  for (const dir of SCAN_DIRS) {
    try {
      walk(join(ROOT, dir), out);
    } catch {
      // folder not present
    }
  }
  return out;
}

/** Every text value of the messages with its key path ("guideHealth.step2"). */
function flatten(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => flatten(child, path ? `${path}.${key}` : key));
}

describe("no government assistance on the site", () => {
  it("finds no benefit term in content files or code (outside the rule explanation)", () => {
    const hits: string[] = [];
    for (const file of filesToScan()) {
      const name = relative(ROOT, file);
      // The messages are checked per key below, so the public-charge text and the one warning can be allowed.
      if (EXEMPT_FILES.includes(name) || name.startsWith("messages")) continue;
      const text = readFileSync(file, "utf-8");
      text.split("\n").forEach((line, i) => {
        for (const term of findBenefitTerms(line))
          hits.push(`${name}:${i + 1} [${term}] ${line.trim().slice(0, 100)}`);
      });
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("finds no benefit term in the messages, in either language, except the public-charge text and the one warning", () => {
    const hits: string[] = [];
    for (const [language, messages] of [
      ["ar", ar],
      ["en", en],
    ] as const) {
      for (const [path, value] of flatten(messages)) {
        if (EXEMPT_MESSAGE_PREFIXES.some((prefix) => path.startsWith(prefix))) continue;
        if (ALLOWED_WARNINGS[path]?.[language] === value) continue;
        for (const term of findBenefitTerms(value))
          hits.push(`${language}:${path} [${term}] ${value.slice(0, 100)}`);
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("allows the health-guide warning only word for word", () => {
    for (const [path, texts] of Object.entries(ALLOWED_WARNINGS)) {
      const [section, key] = path.split(".") as ["guideHealth", string];
      expect((ar[section] as Record<string, string>)[key], `ar ${path}`).toBe(texts.ar);
      expect((en[section] as Record<string, string>)[key], `en ${path}`).toBe(texts.en);
    }
  });

  it("has the warning on the health guide and nowhere else in the messages", () => {
    const holders = flatten(en)
      .filter(([, value]) => /subsid/i.test(value))
      .map(([path]) => path);
    expect(holders).toEqual(["guideHealth.subsidyWarning"]);
  });
});

describe("the detector itself (a planted term is caught)", () => {
  const planted = [
    "Apply for SNAP today",
    "how to get food stamps",
    "load your EBT card",
    "WIC office",
    "Medicaid.gov",
    "CHIP for children",
    "TANF",
    "SSI payment",
    "Section 8 voucher",
    "LIHEAP",
    "free school meals",
    "unemployment benefits",
    "a subsidy on the premium",
    "ACA marketplace",
    "welfare",
    "تقدم على دعم الحكومة",
    "الدعم الحكومي",
    "مساعدات الحكومة",
    "مساعدة حكومية",
    "كوبونات الغذاء",
    "طوابع الغذاء",
    "ميديكيد",
  ];

  it.each(planted)("flags %s", (text) => {
    expect(findBenefitTerms(text).length, text).toBeGreaterThan(0);
  });

  it("does not flag ordinary words that only look similar", () => {
    for (const text of [
      "المتصفح ده مش بيدعم عمل اللينك",
      "مساعدة في التقديم (لو فيه)",
      "a chip with the child's age",
      "snapshot of the plan",
      "Help with the entry (if any)",
      "ولا حاجة تدعمك",
      "assistance",
    ]) {
      expect(findBenefitTerms(text), text).toEqual([]);
    }
  });
});
