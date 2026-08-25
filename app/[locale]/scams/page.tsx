import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/Card";
import { PageHeader, ToolDisclaimer, Bullets } from "@/components/ui";
import { loadScams } from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * الفايز بالقرعة من أكتر الفئات اللي بتتنصب عليها — مواقع بتاخد فلوس
 * على إجراءات حكومية مجانية، و"محامين" وهميين، وعروض شغل وسكن مزيفة.
 */
export default async function ScamsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("scams");
  const lang = locale as "ar" | "en";
  const text = (v: { ar: string; en: string }) => (v[lang]?.trim() ? v[lang] : v.ar);

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("lead")} />

      <Card status="danger">
        <div className="p-5 space-y-1">
          <p className="font-bold">{t("goldenRuleTitle")}</p>
          <p>{t("goldenRule")}</p>
        </div>
      </Card>

      {loadScams().map((s) => (
        <section key={s.id} className="space-y-3">
          <h2 className="text-xl font-bold">{text(s.title)}</h2>
          <p>{text(s.how)}</p>
          <Card status="done">
            <div className="p-4">
              <p className="text-sm">
                <strong>{t("truth")}</strong> {text(s.truth)}
              </p>
            </div>
          </Card>
          <h3 className="font-bold text-sm">{t("redFlags")}</h3>
          <Bullets items={s.redFlags.map(text)} />
        </section>
      ))}

      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
