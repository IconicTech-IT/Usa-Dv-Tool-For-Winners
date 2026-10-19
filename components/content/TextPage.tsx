import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { ContentSections } from "@/components/content/ContentBlocks";
import type { Locale } from "@/i18n/routing";
import { contentPage, type ContentPageName } from "@/lib/content/pages";

interface TextPageProps {
  locale: Locale;
  /** The messages namespace that holds the page's `title` and `lead`. */
  namespace: string;
  content: ContentPageName;
  /** Shown between the lead and the sections (a review date, a legal warning). */
  before?: ReactNode;
}

/** A text page: title, lead, then the sections of its content file. */
export async function TextPage({ locale, namespace, content, before }: TextPageProps) {
  const t = await getTranslations({ locale, namespace });
  return (
    <>
      <h1>{t("title")}</h1>
      <p className="lead">{t("lead")}</p>
      {before}
      <ContentSections content={contentPage(content, locale)} />
    </>
  );
}
