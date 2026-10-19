import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Engineering Library G-13: the site is right-to-left first, so spacing, alignment and
 * position use logical properties (start/end), never left/right.
 */

const STYLE_FILES = ["styles/design.css", "styles/globals.css"];
const PHYSICAL: { name: string; pattern: RegExp }[] = [
  { name: "margin-left / margin-right", pattern: /margin-(left|right)\s*:/ },
  { name: "padding-left / padding-right", pattern: /padding-(left|right)\s*:/ },
  { name: "border-left / border-right", pattern: /border-(left|right)(-[a-z]+)?\s*:/ },
  { name: "text-align: left / right", pattern: /text-align\s*:\s*(left|right)/ },
  { name: "left / right position", pattern: /(^|[;{\s])(left|right)\s*:/m },
  { name: "float", pattern: /float\s*:\s*(left|right)/ },
];

describe("styles use logical properties only", () => {
  for (const file of STYLE_FILES) {
    const css = readFileSync(join(process.cwd(), file), "utf8");
    for (const { name, pattern } of PHYSICAL) {
      it(`${file} has no ${name}`, () => {
        expect(pattern.test(css)).toBe(false);
      });
    }
  }
});
