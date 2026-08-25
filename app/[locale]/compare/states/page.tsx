import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/Card";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { FieldValue } from "@/components/FieldValue";
import { loadStates } from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * ⚠️ الولاية فيها الضرايب والرخصة ونظام التأمين **بس**.
 * الحاجة للعربية والإيجار والجالية كلها بيانات على مستوى المدينة —
 * الصفحة دي بتقول كده صراحة وبتوجّه المستخدم لمقارنة المدن.
 */
export default async function CompareStatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("compareStates");
  const lang = locale as "ar" | "en";
  const states = loadStates();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />

      <Card status="danger">
        <div className="p-4 text-sm">{t("cityWarning")}</div>
      </Card>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[var(--glass-border)]">
              <th scope="col" className="text-start p-2">{t("columns.state")}</th>
              <th scope="col" className="text-start p-2">{t("columns.incomeTax")}</th>
              <th scope="col" className="text-start p-2">{t("columns.salesTax")}</th>
              <th scope="col" className="text-start p-2">{t("columns.noFault")}</th>
              <th scope="col" className="text-start p-2">{t("columns.license")}</th>
            </tr>
          </thead>
          <tbody>
            {states.map((s) => (
              <tr key={s.code} className="border-b border-[var(--glass-border)]">
                <th scope="row" className="text-start p-2 font-medium">
                  {s.name[lang]?.trim() ? s.name[lang] : s.name.ar}
                </th>
                <td className="p-2"><FieldValue field={s.incomeTaxRate as never} /></td>
                <td className="p-2"><FieldValue field={s.salesTax as never} /></td>
                <td className="p-2"><FieldValue field={s.noFaultInsurance as never} /></td>
                <td className="p-2"><FieldValue field={s.licenseProcess as never} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
