import type { Metadata } from "next";

import { routing, type Locale } from "@/i18n/routing";
import { SITE_NAME } from "@/lib/site";

const OPEN_GRAPH_LOCALE: Record<Locale, string> = { ar: "ar_EG", en: "en_US" };

interface PageMetadataInput {
  locale: Locale;
  /** The path without the language prefix, for example "/fees" ("" for the home page). */
  path: string;
  title: string;
  description: string;
}

/** Title, description, canonical and alternate-language links for one public page. */
export function pageMetadata({ locale, path, title, description }: PageMetadataInput): Metadata {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((language) => [language, `/${language}${path}`]),
  );
  languages["x-default"] = `/${routing.defaultLocale}${path}`;

  return {
    title,
    description,
    alternates: { canonical: `/${locale}${path}`, languages },
    openGraph: {
      title,
      description,
      url: `/${locale}${path}`,
      siteName: SITE_NAME,
      locale: OPEN_GRAPH_LOCALE[locale],
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
