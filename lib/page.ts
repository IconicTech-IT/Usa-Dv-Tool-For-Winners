import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { resolveLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

export interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * The `generateMetadata` of a page whose title and description are the `title` and `lead`
 * messages of one namespace.
 */
export function metadataFromMessages(namespace: string, path: string) {
  return async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const locale = await resolveLocale(params);
    const t = await getTranslations({ locale, namespace });
    return pageMetadata({ locale, path, title: t("title"), description: t("lead") });
  };
}
