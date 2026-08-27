import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/ui";
import { Num } from "@/components/Num";
import { DevOnly } from "@/components/DevOnly";
import {
  collectFields,
  collectSourceHosts,
  countStatuses,
  staleFields,
} from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * ⚠️ الصفحة دي بتعرض **أقدم البيانات تحديثًا الأول** بقصد —
 * عشان صاحب الموقع يشوف من غير ما يدوّر إيه اللي محتاج مراجعة،
 * وعشان أي زائر يعرف على إيه بالظبط الموقع لسه مش متأكد.
 */
export default async function SourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sources");

  const fields = collectFields();
  const counts = countStatuses(fields);
  const stale = staleFields(fields);

  const oldest = [...fields]
    .filter((f) => f.status !== "NEEDS_VERIFICATION")
    .sort((a, b) => a.lastVerified.localeCompare(b.lastVerified))
    .slice(0, 25);

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("lead")} />

      <ul className="space-y-2">
        {([
          ["verified", counts.verified],
          ["estimated", counts.estimated],
          ["judgment", counts.judgment],
          ["needsVerification", counts.NEEDS_VERIFICATION],
        ] as const).map(([key, n]) => (
          <Card key={key} as="li" dense>
            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
              <span>{t(`statuses.${key}`)}</span>
              <Num>{n}</Num>
            </div>
          </Card>
        ))}
      </ul>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t("officialSources")}</h2>
        <ul className="space-y-1.5">
          {collectSourceHosts().map((url) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer" className="underline underline-offset-4" dir="ltr">
                {url}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {stale.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("staleTitle")}</h2>
          <p className="text-sm text-[var(--slate)]">{t("staleLead", { count: stale.length })}</p>
        </section>
      )}

      {/**
       * ⚠️ قايمة أقدم الحقول — مسارات ملفات وأسماء حقول برمجية
       * (`metros/arlington-va.json · car.carNeed`). دي أداة صيانة بتاعتنا
       * إحنا، مش معلومة للزائر: هو مش عارف الملفات دي إيه ولا ينفع يعمل
       * بيها حاجة، فبتتحول لضوضاء بتضيّع الجزء المفيد في الصفحة.
       *
       * ⚠️ **الأعداد فوق وقايمة المصادر فاضلين ظاهرين للكل** — دول الوعد
       * بالشفافية نفسه: الزائر لازم يقدر يشوف كام رقم مؤكد وكام لسه محتاج
       * تأكيد ومنين جايين. اللي اتخفى هو التفاصيل التقنية بس.
       */}
      <DevOnly>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t("oldestTitle")}</h2>
        <p className="text-sm text-[var(--slate)]">{t("oldestLead")}</p>
        <ul className="space-y-1.5 text-sm">
          {oldest.map((f, i) => (
            <li key={`${f.file}-${f.path}-${i}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--glass-border)] py-1.5">
              <span className="num text-[var(--slate)]" dir="ltr">
                {f.file} · {f.path}
              </span>
              <Num>{f.lastVerified}</Num>
            </li>
            ))}
          </ul>
        </section>
      </DevOnly>
    </div>
  );
}
