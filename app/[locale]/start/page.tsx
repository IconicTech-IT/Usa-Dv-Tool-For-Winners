import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * ⚠️ أول سؤال فيه خيار "لسه بستكشف" — وهو مش خيار تاني من ٤،
 * هو أول خيار. الموقع مبنيّ لواحد مكسبش ومش مقدّم، والصفحة دي
 * لازم توصّل ده من أول سطر.
 */
const PATHS = [
  { id: "exploring", href: "/eligibility", status: "now" as const },
  { id: "planning", href: "/planner", status: "done" as const },
  { id: "applied", href: "/timeline", status: "later" as const },
  { id: "selected", href: "/checklist/documents", status: "later" as const },
];

export default async function StartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("start");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />

      <ul className="space-y-3">
        {PATHS.map((p) => (
          <Card key={p.id} as="li" status={p.status}>
            <Link href={p.href} className="block p-5 space-y-1">
              <span className="block font-bold">{t(`paths.${p.id}.label`)}</span>
              <span className="block text-sm text-[var(--slate)]">
                {t(`paths.${p.id}.hint`)}
              </span>
            </Link>
          </Card>
        ))}
      </ul>

      <p className="text-sm text-[var(--slate)]">{t("noWrongAnswer")}</p>
    </div>
  );
}
