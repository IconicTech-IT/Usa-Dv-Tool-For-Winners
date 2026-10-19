import { describe, expect, it } from "vitest";

import { contentPage, type ContentPageName } from "@/lib/content/pages";

const NAMES: ContentPageName[] = ["about", "charge", "english", "privacy"];

describe("text pages", () => {
  it.each(NAMES)("%s has the same structure in Arabic and English", (name) => {
    const ar = contentPage(name, "ar");
    const en = contentPage(name, "en");
    expect(en.sections.length).toBe(ar.sections.length);
    ar.sections.forEach((section, i) => {
      const other = en.sections[i];
      expect(
        other?.blocks.map((b) => b.type),
        `${name} section ${i + 1}`,
      ).toEqual(section.blocks.map((b) => b.type));
    });
    expect(Boolean(en.footnote)).toBe(Boolean(ar.footnote));
  });

  it.each(NAMES)("%s gives the same links in both languages, each used once per page", (name) => {
    const urls = (locale: "ar" | "en") =>
      contentPage(name, locale)
        .sections.flatMap((s) => s.blocks)
        .flatMap((b) => (b.type === "links" ? b.items.map((l) => l.url) : []));
    expect(urls("en")).toEqual(urls("ar"));
    expect(new Set(urls("ar")).size).toBe(urls("ar").length);
  });

  it("keeps the unconfirmed marks of the public-charge page in both languages", () => {
    const text = (locale: "ar" | "en") => JSON.stringify(contentPage("charge", locale));
    expect(text("ar")).toContain("غير مؤكد");
    expect(text("en")).toContain("nconfirmed");
  });

  it("states no money amount on the public-charge page: the poverty line is a link, not a number", () => {
    const text = JSON.stringify(contentPage("charge", "ar")) + JSON.stringify(contentPage("charge", "en"));
    expect(text).not.toMatch(/\$\s?\d/);
  });
});
