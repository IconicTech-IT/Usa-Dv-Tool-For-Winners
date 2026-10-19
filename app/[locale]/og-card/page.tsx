import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OgCard } from "@/components/og/OgCard";
import { resolveLocale } from "@/lib/locale";
import type { PageProps } from "@/lib/page";

/**
 * The page the share image is photographed from (scripts/make-og.ts). It exists only while
 * OG_CARD=1 is set, so on the real site this address is a 404.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function Page({ params }: PageProps) {
  const locale = await resolveLocale(params);
  if (process.env["OG_CARD"] !== "1") notFound();
  return <OgCard locale={locale} />;
}
