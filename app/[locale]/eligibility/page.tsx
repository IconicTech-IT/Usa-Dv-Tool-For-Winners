import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/Card";
import { PageHeader, Section, ToolDisclaimer, LastUpdated } from "@/components/ui";
import { FieldValue } from "@/components/FieldValue";
import { StaleWarning } from "@/components/StaleWarning";
import { loadEligibility } from "@/lib/content/load";
import type { Field, Localized } from "@/lib/types";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * أول سؤال حقيقي عند أي حد لسه مقدّمش.
 *
 * ⚠️ الملف اللي وراها (`content/eligibility.json`) أسرع ملف بيبوظ في
 * المشروع — قايمة الدول بتتغير كل دورة. عشان كده الصفحة بتعرض
 * `lastVerified` للمستخدم، وبتحذّر لوحدها لو التاريخ بقى قديم.
 */
export default async function EligibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("eligibility");
  const lang = locale as "ar" | "en";

  const data = loadEligibility();
  const text = (v: Localized) => (v[lang]?.trim() ? v[lang] : v.ar);

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("lead")} />

      <StaleWarning
        lastVerified={data.lastVerified}
        verifyIn={data.verifyIn}
        message={t("staleWarning")}
      />

      {data.criteria.map((c) => {
        // كل مفتاح زيادة في المعيار هو حقل كامل بقواعده
        const fields = Object.entries(c).filter(
          ([k, v]) =>
            !["id", "name", "explain"].includes(k) &&
            typeof v === "object" &&
            v !== null &&
            "status" in (v as object),
        ) as [string, Field<number | string | boolean>][];

        return (
          <Card key={c.id} status="now">
            <div className="p-5 space-y-3">
              <h2 className="text-lg font-bold">{text(c.name)}</h2>
              <p className="leading-relaxed">{text(c.explain)}</p>

              <ul className="space-y-2 pt-2">
                {fields.map(([key, field]) => (
                  <li key={key} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-[var(--slate)]">
                      {t(`fields.${key}`)}
                    </span>
                    <FieldValue field={field} />
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        );
      })}

      <Section>
        <Card status="danger">
          <div className="p-5 space-y-2">
            <p className="font-bold">{t("officialTitle")}</p>
            <p>{text(data.disclaimer)}</p>
            <a
              href="https://travel.state.gov/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              travel.state.gov
            </a>
          </div>
        </Card>
        <LastUpdated date={data.lastVerified} label={t("lastVerified")} />
      </Section>

      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
