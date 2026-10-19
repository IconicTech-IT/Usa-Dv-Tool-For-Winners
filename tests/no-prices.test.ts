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
        for (const p of PATTERNS) {
          if (p.re.test(line)) {
            hits.push(`${relative(ROOT, file)}:${i + 1} [${p.name}] ${line.trim().slice(0, 120)}`);
          }
        }
      });
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
