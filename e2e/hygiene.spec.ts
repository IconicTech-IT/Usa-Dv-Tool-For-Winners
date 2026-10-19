import { expect, test, type Page } from "@playwright/test";

import { ALL_PATHS, LOCALES, seedPlan } from "./helpers";

/**
 * UI hygiene on every page, in both languages, both colour schemes, phone and desktop width:
 * no browser-default links, buttons or fields, no raw message keys, no empty text boxes, no
 * duplicate links in one list, nothing sticking out of its box, no errors in the console.
 */

interface Problem {
  kind: string;
  detail: string;
}

/** Runs in the page. Returns what looks wrong; an empty list means the page is clean. */
async function findProblems(page: Page): Promise<Problem[]> {
  return page.evaluate(() => {
    const problems: { kind: string; detail: string }[] = [];
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""} "${(el.textContent ?? "").trim().slice(0, 40)}"`;
    const visible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };

    // 1. Browser-default links: the default blue (and purple for visited) in light and dark.
    const defaultLinkColours = new Set([
      "rgb(0, 0, 238)",
      "rgb(85, 26, 139)",
      "rgb(158, 158, 255)",
      "rgb(208, 173, 240)",
    ]);
    for (const a of document.querySelectorAll("a")) {
      if (visible(a) && defaultLinkColours.has(getComputedStyle(a).color)) {
        problems.push({ kind: "default link colour", detail: describe(a) });
      }
    }

    // 2. Browser-default buttons: the grey face with an outset border.
    for (const button of document.querySelectorAll("button")) {
      if (!visible(button)) continue;
      const style = getComputedStyle(button);
      const isDefaultFace =
        style.backgroundColor === "rgb(239, 239, 239)" || style.backgroundColor === "rgb(233, 233, 237)";
      if (isDefaultFace && style.borderTopStyle === "outset") {
        problems.push({ kind: "default button", detail: describe(button) });
      }
    }

    // 3. Browser-default fields: an inset border on a visible input, select or textarea.
    for (const field of document.querySelectorAll(
      "input:not([type=file]):not([type=hidden]), select, textarea",
    )) {
      if (!visible(field)) continue;
      const style = getComputedStyle(field);
      const insideStyledBox = field.closest(".input, .eq, .search, .chip");
      if (!insideStyledBox && (style.borderTopStyle === "inset" || style.borderTopStyle === "groove")) {
        problems.push({ kind: "default field", detail: describe(field) });
      }
    }

    // 4. Raw message keys and placeholders.
    const text = document.body.innerText;
    for (const match of text.matchAll(
      /\b(?:calc|common|guide|fees|moving|runway|results|compare|setup|rate|scam|charge|english|pages|offline|pwa)\.[a-zA-Z]+(?:\.[a-zA-Z0-9]+)*\b/g,
    )) {
      problems.push({ kind: "raw message key", detail: match[0] });
    }
    for (const marker of [
      "MISSING_MESSAGE",
      "undefined",
      "[object Object]",
      "TODO",
      "[LINK]",
      "[DATE]",
      "NaN",
    ]) {
      if (text.includes(marker)) problems.push({ kind: "placeholder text", detail: marker });
    }

    // 5. Empty text boxes (a note, help line or warning with nothing in it that is still shown).
    for (const el of document.querySelectorAll(".note, .warn, .errt, .lead, .muted, .fxnote")) {
      if (visible(el) && (el.textContent ?? "").trim() === "")
        problems.push({ kind: "empty text box", detail: describe(el) });
    }

    // 6. The same address twice in one list of links.
    for (const list of document.querySelectorAll(".links")) {
      const seen = new Set<string>();
      for (const a of list.querySelectorAll("a")) {
        if (seen.has(a.href)) problems.push({ kind: "duplicate link", detail: a.href });
        seen.add(a.href);
      }
    }

    // 7. Something wider than the page, or text cut off inside a box that does not scroll.
    const pageWidth = document.documentElement.clientWidth;
    for (const el of document.querySelectorAll("main *, footer *, header *")) {
      if (!visible(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.right > pageWidth + 1 || rect.left < -1) {
        // The currency list and similar fixed layers are measured inside their own box.
        if (!el.closest("dialog")) problems.push({ kind: "sticks out of the page", detail: describe(el) });
      }
    }
    for (const el of document.querySelectorAll(".lnk, .btn, .chip, .field .label, .scen .sc, .tl .it")) {
      if (visible(el) && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") {
        problems.push({ kind: "text cut off", detail: describe(el) });
      }
    }

    // 8. Images without a text alternative.
    for (const img of document.querySelectorAll("img")) {
      if (!img.hasAttribute("alt")) problems.push({ kind: "image without alt", detail: describe(img) });
    }

    return problems;
  });
}

for (const scheme of ["light", "dark"] as const) {
  for (const width of [375, 1280]) {
    for (const locale of LOCALES) {
      test.describe(`${locale} ${scheme} ${width}px`, () => {
        test.use({ colorScheme: scheme, viewport: { width, height: 900 } });

        test("every page is free of default-styled and broken elements", async ({ page }) => {
          await seedPlan(page);
          const consoleProblems: string[] = [];
          page.on("console", (message) => {
            // Vercel serves its visit counter script only on Vercel, so a local build gets a 404 for it.
            const isVercelOnly =
              message.text().includes("_vercel/insights") || message.text().includes("status of 404");
            if ((message.type() === "error" || message.type() === "warning") && !isVercelOnly) {
              consoleProblems.push(message.text());
            }
          });
          page.on("pageerror", (error) => consoleProblems.push(error.message));

          const report: string[] = [];
          for (const path of ALL_PATHS) {
            await page.goto(`/${locale}${path}`);
            await page.waitForLoadState("networkidle");
            for (const problem of await findProblems(page))
              report.push(`${path || "/"}: ${problem.kind}: ${problem.detail}`);
          }
          for (const message of consoleProblems) report.push(`console: ${message.slice(0, 160)}`);
          expect(report, report.join("\n")).toEqual([]);
        });
      });
    }
  }
}
