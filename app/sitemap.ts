import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { PAGE_PATHS } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";

/** One entry per page and language, each pointing at its translations. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGE_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((other) => [other, `${SITE_URL}/${other}${path}`])),
      },
    })),
  );
}
