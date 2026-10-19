import about from "@/content/pages/about.json";
import charge from "@/content/pages/charge.json";
import privacy from "@/content/pages/privacy.json";
import type { Locale } from "@/i18n/routing";
import { LocalizedPageSchema, type PageContent } from "@/lib/content/schema";

/** The text pages kept as data. Parsing here means a broken content file fails the build. */
const PAGES = {
  about: LocalizedPageSchema.parse(about),
  charge: LocalizedPageSchema.parse(charge),
  privacy: LocalizedPageSchema.parse(privacy),
};

export type ContentPageName = keyof typeof PAGES;

export function contentPage(name: ContentPageName, locale: Locale): PageContent {
  return PAGES[name][locale];
}
