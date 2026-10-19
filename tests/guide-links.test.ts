import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ITEMS } from "@/lib/calc/catalog";
import { allGuideUrls, GuideLinksSchema, guideSitesFor, hasGuide } from "@/lib/guide/links";

const rawText = readFileSync(join(process.cwd(), "content", "guide-links.json"), "utf8");
const data = GuideLinksSchema.parse(JSON.parse(rawText));

/** Items for which there is no sensible single source: no guide button. */
const NO_GUIDE = ["otherMoving", "otherMonthly"];

const TRACKING = /[?&](utm_[a-z]+|ref|aff|affid|affiliate|tag|clickid|gclid|fbclid|cid|campaign)=/i;

describe("guide links", () => {
  it("has an entry for every cost item and nothing else", () => {
    expect(Object.keys(data.items).sort()).toEqual(ITEMS.map((i) => i.id).sort());
  });

  it("gives every item at least one source, except the catch-all items", () => {
    for (const item of ITEMS) {
      const ids = data.items[item.id] ?? [];
      if (NO_GUIDE.includes(item.id)) expect(ids, item.id).toEqual([]);
      else expect(ids.length, item.id).toBeGreaterThan(0);
    }
  });

  it("only refers to sites that exist, and every site is used", () => {
    const known = new Set(Object.keys(data.sites));
    const used = new Set<string>();
    for (const [item, ids] of Object.entries(data.items)) {
      expect(new Set(ids).size, `${item} lists a site twice`).toBe(ids.length);
      for (const id of ids) {
        expect(known.has(id), `${item} -> ${id}`).toBe(true);
        used.add(id);
      }
    }
    expect([...known].filter((id) => !used.has(id))).toEqual([]);
  });

  it("uses https, no duplicates, and no affiliate or tracking parameters", () => {
    const seen = new Set<string>();
    for (const { id, url } of allGuideUrls()) {
      expect(url.startsWith("https://"), id).toBe(true);
      expect(TRACKING.test(url), `${id}: ${url}`).toBe(false);
      expect(seen.has(url), `duplicate ${url}`).toBe(false);
      seen.add(url);
    }
  });

  it("marks a source official exactly when it is a .gov site", () => {
    for (const [id, site] of Object.entries(data.sites)) {
      const gov = new URL(site.url).hostname.endsWith(".gov");
      expect(Boolean(site.official), id).toBe(gov);
    }
  });

  it("has a warning on the marketplaces where scams are common", () => {
    for (const id of ["facebookMarketplace", "offerUp"]) {
      expect(data.sites[id]?.watch, id).toBeDefined();
    }
  });

  it("is not marked as checked in a browser until a person did that", () => {
    // Change this test together with linksLastChecked when someone has opened every link.
    expect(data.linksLastChecked).toBeNull();
  });

  it("resolves sources for the app", () => {
    expect(hasGuide("rent")).toBe(true);
    expect(hasGuide("otherMonthly")).toBe(false);
    expect(hasGuide("noSuchItem")).toBe(false);
    const food = guideSitesFor("food").map((s) => s.id);
    expect(food).toContain("usdaFoodPlans");
    expect(guideSitesFor("health").length).toBe(0);
  });
});
