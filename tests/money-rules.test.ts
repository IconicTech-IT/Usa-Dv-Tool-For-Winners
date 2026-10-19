import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Engineering Library A-01 and A-02: money is never computed with binary floating point
 * and there is one rounding rule. These patterns must not appear in the calculator code.
 */

const CALC_DIR = join(process.cwd(), "lib", "calc");
const FORBIDDEN: { name: string; pattern: RegExp }[] = [
  { name: "parseFloat", pattern: /parseFloat\(/ },
  { name: "toFixed", pattern: /\.toFixed\(/ },
  { name: "Math.round", pattern: /Math\.round\(/ },
  { name: "Math.floor", pattern: /Math\.floor\(/ },
];

describe("calculator code keeps money exact", () => {
  const files = readdirSync(CALC_DIR).filter((name) => name.endsWith(".ts"));

  it("finds the calculator files", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const { name, pattern } of FORBIDDEN) {
    it(`never uses ${name} in lib/calc`, () => {
      const hits = files.filter((file) => pattern.test(readFileSync(join(CALC_DIR, file), "utf8")));
      expect(hits).toEqual([]);
    });
  }
});
