import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { CompareCities } from "@/components/tools/CompareCities";
import { loadMetros } from "@/lib/content/load";
import { toPlannerMetro } from "@/lib/planner/metro";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function CompareCitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("compareCities");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      <CompareCities metros={loadMetros().map(toPlannerMetro)} />
      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
