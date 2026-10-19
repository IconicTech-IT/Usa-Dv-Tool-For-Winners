import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * قاعدة صاحب الموقع (2026-10-19): مفيش أي سعر ولا رسم ولا مرتب ولا إيجار ولا
 * "متوسط" من عندنا. المستخدم هو اللي بيكتب كل رقم. الاختبار ده بيفشل لو أي
 * ملف محتوى أو رسالة أو كود فيه مبلغ مالي مكتوب.
 */

const ROOT = process.cwd();
const SCAN_DIRS = ["content", "messages", "app", "components", "lib", "public"];
const EXTENSIONS = [".json", ".ts", ".tsx", ".md", ".js"];
const IGNORE = ["node_modules", ".next"];

const DIGITS = "[0-9\\u0660-\\u0669\\u06F0-\\u06F9]";
const CURRENCY_WORDS =
  "(?:USD|EGP|SAR|AED|EUR|GBP|دولار|دولارات|جنيه|ريال|درهم|دينار|يورو|dollars?|pounds?|euros?)";

const NUMBER = `${DIGITS}+(?:[,.\u066B\u066C]${DIGITS}+)*`;

const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "$ before number", re: new RegExp(`\\$\\s?${DIGITS}`) },
  { name: "number before $", re: new RegExp(`${NUMBER}\\s?\\$`) },
  {
    name: "number then currency word",
    re: new RegExp(`${NUMBER}\\s?${CURRENCY_WORDS}(?![A-Za-z])`, "i"),
  },
  {
    name: "currency word then number",
    re: new RegExp(`\\b(?:USD|EGP)\\s?${DIGITS}`, "i"),
  },
];

/**
 * The ONE amount the site may state (owner decision, 2026-10-19): the official lottery
 * registration fee. It is a public, official fact set by the US State Department in the final
 * rule published in the Federal Register on 16 September 2025 (90 FR 44524, document
 * 2025-17851, https://public-inspection.federalregister.gov/2025-17851.pdf).
 * Only these exact phrases are allowed, so any other amount is still caught.
 */
export const ALLOWED_PHRASES: readonly string[] = [
  "التسجيل في القرعة برسم رسمي دولار واحد بس ($1)، بقرار من الخارجية الأمريكية",
  "Registering for the lottery has an official fee of just one dollar ($1), set by the US State Department",
];

/** The line without the allowed phrases. */
export function withoutAllowed(line: string): string {
  return ALLOWED_PHRASES.reduce((text, phrase) => text.split(phrase).join(""), line);
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (IGNORE.includes(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXTENSIONS.some((e) => name.endsWith(e))) out.push(full);
  }
}

function filesToScan(): string[] {
  const out: string[] = [];
  for (const d of SCAN_DIRS) {
    try {
      walk(join(ROOT, d), out);
    } catch {
      // folder not present
    }
  }
  return out;
}

describe("no prices from us", () => {
  it("finds no money amount in content, messages, code or public files", () => {
    const hits: string[] = [];
    for (const file of filesToScan()) {
      // this guide is about the test itself, not site content
      const text = readFileSync(file, "utf-8");
      text.split("\n").forEach((line, i) => {
        const checked = withoutAllowed(line);
        for (const p of PATTERNS) {
          if (p.re.test(checked)) {
            hits.push(`${relative(ROOT, file)}:${i + 1} [${p.name}] ${line.trim().slice(0, 120)}`);
          }
        }
      });
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
  it("allows the registration fee phrase and nothing else", () => {
    const [arabic] = ALLOWED_PHRASES;
    expect(arabic).toBeDefined();
    const allowedLine = `"${arabic ?? ""}. أي فلوس زيادة"`;
    expect(PATTERNS.some((p) => p.re.test(allowedLine))).toBe(true);
    expect(PATTERNS.some((p) => p.re.test(withoutAllowed(allowedLine)))).toBe(false);
    // The same sentence with another amount is still caught.
    const otherAmount = (arabic ?? "").replace("$1", "$25");
    expect(PATTERNS.some((p) => p.re.test(withoutAllowed(otherAmount)))).toBe(true);
    expect(PATTERNS.some((p) => p.re.test(withoutAllowed("the fee is $1 for everyone")))).toBe(true);
  });
});
