import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { TakeHome } from "@/components/calculators/TakeHome";
import { loadMetros, loadStates, loadTaxTables } from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function TakeHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("takeHome");

  const states = loadStates().map((s) => ({
    code: s.code,
    name: s.name,
    flatRate: typeof s.incomeTaxRate.value === "number" ? s.incomeTaxRate.value : null,
    brackets: (s.incomeTaxBrackets?.value ?? null) as never,
    /**
     * ⚠️ "مفيش ضريبة دخل" معلومة، مش نقص معلومة.
     *
     * تكساس وفلوريدا ونيفادا وتينيسي وواشنطن مسجّل عندنا إن مفيش فيهم
     * ضريبة دخل ولاية — والحاسبة كانت بتقرا `incomeTaxRate` (اللي `null`
     * بطبيعة الحال) وتقول للمستخدم **"محتاج تأكيد"**. يعني بنقوله "مش
     * عارفين" عن حاجة إحنا عارفينها، وبنخوّفه من رقم مش موجود أصلًا.
     */
    hasIncomeTax:
      typeof s.hasStateIncomeTax?.value === "boolean"
        ? s.hasStateIncomeTax.value
        : null,
  }));

  const metros = loadMetros().map((m) => ({
    slug: m.slug,
    name: m.name,
    state: m.state,
    localTaxRate:
      typeof m.localIncomeTax?.value === "number" ? m.localIncomeTax.value : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      <TakeHome tables={loadTaxTables() as never} states={states} metros={metros} />
      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
