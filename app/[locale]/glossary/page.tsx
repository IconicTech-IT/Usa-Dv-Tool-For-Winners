import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { loadGlossary } from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function GlossaryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("glossary");
  const lang = locale as "ar" | "en";

  const terms = [...loadGlossary()].sort((a, b) => a.term.localeCompare(b.term));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />

      {/* ⚠️ مفيش <Card> هنا بقصد: الكارت بيلف المحتوى في div جواه div،
          والـ<dt>/<dd> ساعتها بيبعدوا عن الـ<dl> بمستويين وده بيكسر
          بنية قايمة التعريفات. فبنستخدم كلاس الكارت على div واحد. */}
      <dl className="space-y-3">
        {terms.map((term) => (
          <div key={term.term} className="card card--list p-4 space-y-1.5">
            <dt className="flex flex-wrap items-baseline gap-3">
                <span className="font-bold" dir="ltr">{term.term}</span>
                <span className="text-sm text-[var(--slate)]" dir="ltr">
                  {term.pronunciation}
                </span>
              </dt>
              <dd className="space-y-1.5">
                <p>{lang === "ar" ? term.ar : term.en || term.ar}</p>
                <p className="text-sm text-[var(--slate)]">
                  {term.whyItMatters[lang]?.trim()
                    ? term.whyItMatters[lang]
                    : term.whyItMatters.ar}
                </p>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
