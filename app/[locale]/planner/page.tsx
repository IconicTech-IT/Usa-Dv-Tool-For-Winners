import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { Planner } from "@/components/planner/Planner";
import { loadMetros } from "@/lib/content/load";
import { toPlannerMetro } from "@/lib/planner/metro";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * الأداة الأهم في الموقع.
 * الداتا بتتقرا وقت الـbuild وبتتبعت للمتصفح — المحرك كله client-side،
 * فمفيش سيرفر ومفيش حساب ومفيش تكلفة تشغيل.
 */
export default async function PlannerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("planner");

  const metros = loadMetros().map(toPlannerMetro);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      <Planner metros={metros} />
      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
