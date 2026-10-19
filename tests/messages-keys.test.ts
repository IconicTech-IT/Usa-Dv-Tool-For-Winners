import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ITEMS, QUICK_ITEMS, STAGES, type Scaling } from "@/lib/calc/catalog";
import { SCENARIO_START_MONTHS } from "@/lib/calc/compute";
import type { OpenFailure } from "@/lib/calc/plan-file";
import type { ParseFailure } from "@/lib/calc/parse-amount";

type Tree = { [key: string]: string | Tree };

function load(locale: "ar" | "en"): Tree {
  return JSON.parse(readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8")) as Tree;
}

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

function branch(tree: Tree, name: string): Tree {
  const node = (tree["calc"] as Tree)[name];
  if (typeof node === "string" || node === undefined)
    throw new Error(`calc.${name} is missing or not a group`);
  return node;
}

const AR = load("ar");
const EN = load("en");

// If a type gains a value, the next lines stop compiling until the list below is updated.
const PARSE_FAILURES = ["empty", "invalid", "negative"] as const satisfies readonly ParseFailure[];
const OPEN_FAILURES = [
  "too-large",
  "not-json",
  "wrong-format",
  "invalid",
] as const satisfies readonly OpenFailure[];
const SCALINGS = ["total", "perPerson", "perAdult", "perChild"] as const satisfies readonly Scaling[];
type _AllScaling = Exclude<Scaling, (typeof SCALINGS)[number]> extends never ? true : never;
const _scalingCheck: _AllScaling = true;
type _AllParse = Exclude<ParseFailure, (typeof PARSE_FAILURES)[number]> extends never ? true : never;
type _AllOpen = Exclude<OpenFailure, (typeof OPEN_FAILURES)[number]> extends never ? true : never;
const _parseCheck: _AllParse = true;
const _openCheck: _AllOpen = true;

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? "").sort();
}

describe("messages", () => {
  const arFlat = flatten(AR);
  const enFlat = flatten(EN);

  it("has the same keys in Arabic and English", () => {
    expect(Object.keys(arFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it("has no empty text", () => {
    for (const [key, value] of [...Object.entries(arFlat), ...Object.entries(enFlat)]) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("uses the same {placeholders} in both languages", () => {
    for (const key of Object.keys(arFlat)) {
      expect(placeholders(arFlat[key] ?? ""), key).toEqual(placeholders(enFlat[key] ?? ""));
    }
  });

  for (const [name, tree] of [
    ["ar", AR],
    ["en", EN],
  ] as const) {
    describe(`calc labels (${name})`, () => {
      it("has a label for every cost item and every quick box, and no extra", () => {
        const ids = [...ITEMS, ...QUICK_ITEMS].map((i) => i.id).sort();
        expect(Object.keys(branch(tree, "items")).sort()).toEqual(ids);
      });

      it("has a label for every stage", () => {
        expect(Object.keys(branch(tree, "stages")).sort()).toEqual([...STAGES].sort());
      });

      it("has a label for every group used by an item", () => {
        const groups = [...new Set([...ITEMS, ...QUICK_ITEMS].map((i) => i.group))].sort();
        expect(Object.keys(branch(tree, "groups")).sort()).toEqual(groups);
      });

      it("has a label for every scaling kind", () => {
        expect(Object.keys(branch(tree, "scaling")).sort()).toEqual([...SCALINGS].sort());
      });

      it("has a label for every runway scenario", () => {
        const expected = SCENARIO_START_MONTHS.map((n) => `start${n}`).sort();
        expect(Object.keys(branch(tree, "scenarios")).sort()).toEqual(expected);
      });

      it("has a message for every amount error and every file-open failure", () => {
        expect(Object.keys(branch(tree, "errors"))).toEqual(expect.arrayContaining([...PARSE_FAILURES]));
        const plan = branch(tree, "plan");
        const failures = plan["openFailures"];
        expect(typeof failures).toBe("object");
        expect(Object.keys(failures as Tree).sort()).toEqual([...OPEN_FAILURES].sort());
      });
    });
  }

  it("keeps the compile-time exhaustiveness checks alive", () => {
    expect(_parseCheck && _openCheck && _scalingCheck).toBe(true);
  });
});
