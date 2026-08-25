import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/Card";
import { Num } from "@/components/Num";
import { collectFields, countStatuses } from "@/lib/content/load";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  // بيتقرا وقت الـbuild — الصفحة static
  const counts = countStatuses(collectFields());
  const rows = [
    { key: "dataVerified", n: counts.verified, status: "done" as const },
    { key: "dataEstimated", n: counts.estimated, status: "later" as const },
    { key: "dataJudgment", n: counts.judgment, status: "later" as const },
    {
      key: "dataNeedsVerification",
      n: counts.NEEDS_VERIFICATION,
      status: "now" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-lg leading-relaxed">{t("lead")}</p>
      </section>

      <Card status="now">
        <div className="p-5 space-y-2">
          <p>{t("notWonYet")}</p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link href="/planner" className="underline underline-offset-4">
              {t("startPlanner")}
            </Link>
            <Link href="/eligibility" className="underline underline-offset-4">
              {t("checkEligibility")}
            </Link>
          </div>
        </div>
      </Card>

      <Card status="done">
        <div className="p-5 space-y-2">
          <h2 className="font-bold">{t("phaseNoteTitle")}</h2>
          <p className="text-sm">{t("phaseNote")}</p>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="font-bold">{t("dataTitle")}</h2>
        <ul className="space-y-2">
          {rows.map((r) => (
            <Card key={r.key} as="li" status={r.status} dense>
              <div className="flex items-center justify-between gap-4 px-4 py-2">
                <span>{t(r.key)}</span>
                <Num>{r.n}</Num>
              </div>
            </Card>
          ))}
        </ul>
      </section>
    </div>
  );
}
