import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/Card";
import { PageHeader, Section, ToolDisclaimer } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { loadInterview } from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * ⚠️ المبدأ الحاكم للصفحة دي وللمحاكي:
 * الهدف إن الناس تتدرب تقول **الحقيقة** بوضوح وثقة.
 * ممنوع نهائيًا أي محتوى بيعلّم حد يجمّل إجابة أو يخبي حاجة.
 */
export default async function InterviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("interview");
  const lang = locale as "ar" | "en";
  const data = loadInterview();
  const text = (v: { ar: string; en: string }) => (v[lang]?.trim() ? v[lang] : v.ar);

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("lead")} />

      <Card status="danger">
        <div className="p-5">
          <p className="font-bold">{text(data.principle)}</p>
        </div>
      </Card>

      <Link href="/interview/simulator" className="inline-block underline underline-offset-4">
        {t("openSimulator")}
      </Link>

      {data.categories.map((cat) => (
        <Section key={cat.id} title={text(cat.name)}>
          <ul className="space-y-3">
            {cat.questions.map((q, i) => (
              <Card key={i} as="li">
                <div className="p-4 space-y-2">
                  <h3 className="font-bold">{text(q.q)}</h3>
                  <p className="text-sm text-[var(--slate)]">
                    <strong>{t("whyAsked")}</strong> {text(q.why)}
                  </p>
                  <p className="text-sm">
                    <strong>{t("prepare")}</strong> {text(q.prepare)}
                  </p>
                </div>
              </Card>
            ))}
          </ul>
        </Section>
      ))}

      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
