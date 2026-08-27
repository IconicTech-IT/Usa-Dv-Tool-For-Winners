import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { Planner } from "@/components/planner/Planner";
import { loadMetros, loadStates } from "@/lib/content/load";
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

  /**
   * ⚠️ أسماء الولايات كاملة — مش الرمز.
   *
   * قايمة الاختيار كانت بتعرض `TX` و`CA`. اللي محتاج الموقع ده أصلًا
   * غالبًا لسه مشافش أمريكا، ومش المفروض يعرف رموز الولايات — الرمز
   * بيخليه يختار غلط أو يسيب السؤال.
   */
  const stateNames = Object.fromEntries(loadStates().map((s) => [s.code, s.name]));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      <Planner metros={metros} stateNames={stateNames} />
      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
