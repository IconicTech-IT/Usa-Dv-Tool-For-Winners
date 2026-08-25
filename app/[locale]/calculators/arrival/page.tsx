import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { ArrivalCalc } from "@/components/calculators/ArrivalRunway";
import { loadMetros } from "@/lib/content/load";
import { toPlannerMetro } from "@/lib/planner/metro";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("arrival");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      <ArrivalCalc metros={loadMetros().map(toPlannerMetro)} />
      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
