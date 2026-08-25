import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { CarCalc } from "@/components/calculators/CarCalc";
import { loadMetros } from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function CarCalcPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("car");

  const metros = loadMetros().map((m) => ({
    slug: m.slug,
    name: m.name,
    state: m.state,
    localTaxRate: null,
    carInsurance:
      typeof m.costs.carInsurance.value === "number" ? m.costs.carInsurance.value : null,
    carNeed: typeof m.car.carNeed.value === "number" ? m.car.carNeed.value : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("calcTitle")} lead={t("calcLead")} />
      <CarCalc metros={metros} />
      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
