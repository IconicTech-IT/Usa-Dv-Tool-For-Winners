import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GuideScreen } from "@/components/guide/GuideScreen";
import { routing } from "@/i18n/routing";
import { guideText } from "@/lib/guide/copy";
import { GUIDE_ITEM_IDS } from "@/lib/guide/links";
import { resolveLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

interface GuidePageProps {
  params: Promise<{ locale: string; item: string }>;
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => GUIDE_ITEM_IDS.map((item) => ({ locale, item })));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { item } = await params;
  const locale = await resolveLocale(params);
  if (!GUIDE_ITEM_IDS.includes(item)) notFound();
  const text = guideText(await getTranslations({ locale }), item);
  return pageMetadata({ locale, path: `/guide/${item}`, title: text.title, description: text.lead });
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { item } = await params;
  const locale = await resolveLocale(params);
  if (!GUIDE_ITEM_IDS.includes(item)) notFound();
  return <GuideScreen itemId={item} locale={locale} />;
}
