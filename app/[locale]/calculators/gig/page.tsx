import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { GigCalc } from "@/components/calculators/GigCalc";
import { loadMetros, loadTaxTables } from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function GigPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("gig");

  const metros = loadMetros().map((m) => ({
    slug: m.slug,
    name: m.name,
    state: m.state,
    localTaxRate: null,
    carInsurance:
      typeof m.costs.carInsurance.value === "number" ? m.costs.carInsurance.value : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      <GigCalc tables={loadTaxTables() as never} metros={metros} />
      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
