import { z } from "zod";

import raw from "@/content/guide-links.json";

/**
 * The sources behind every "How do I find this price?" button. Only links: the
 * site never states a price. Each cost item points to a few real sources (official
 * where one exists); the user opens them and types the price he finds.
 */

const Localized = z.object({ ar: z.string().min(1), en: z.string().min(1) });

const Site = z.object({
  name: Localized,
  url: z.string().url().startsWith("https://"),
  what: Localized,
  official: z.boolean().optional(),
  watch: Localized.optional(),
});

export const GuideLinksSchema = z.object({
  _note: z.string(),
  /** ISO date a person last opened every link in a real browser, or null. */
  linksLastChecked: z.string().nullable(),
  sites: z.record(z.string().min(1), Site),
  items: z.record(z.string().min(1), z.array(z.string().min(1))),
});

export type GuideSite = z.infer<typeof Site> & { id: string };

const data = GuideLinksSchema.parse(raw);

export const GUIDE_LINKS_LAST_CHECKED: string | null = data.linksLastChecked;

/** The sources for one cost item; empty when the item has no guide (no button then). */
export function guideSitesFor(itemId: string): GuideSite[] {
  const ids = data.items[itemId] ?? [];
  const sites: GuideSite[] = [];
  for (const id of ids) {
    const site = data.sites[id];
    if (site) sites.push({ id, ...site });
  }
  return sites;
}

export function hasGuide(itemId: string): boolean {
  return guideSitesFor(itemId).length > 0;
}

/** Every distinct link, for the link checker. */
export function allGuideUrls(): { id: string; url: string }[] {
  return Object.entries(data.sites).map(([id, site]) => ({ id, url: site.url }));
}

/** Ids of the items that have a guide page. */
export const GUIDE_ITEM_IDS: readonly string[] = Object.keys(data.items).filter(hasGuide);

/** Every source the site sends people to, official ones first, for the sources page. */
export function allGuideSites(): GuideSite[] {
  return Object.entries(data.sites)
    .map(([id, site]): GuideSite => ({ id, ...site }))
    .sort((a, b) => Number(Boolean(b.official)) - Number(Boolean(a.official)));
}
