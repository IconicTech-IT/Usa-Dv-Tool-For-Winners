import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/ui";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * جملتين بسيطتين من غير مبالغة ومن غير كلام عن النفس.
 * ⚠️ ممنوع أي زرار تبرع أو دعم مهما كان شكله.
 */
export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      <div className="space-y-4 leading-relaxed">
        <p>{t("free")}</p>
        <p>{t("privacy")}</p>
        <p>{t("humanEffort")}</p>
      </div>

      <Card status="danger">
        <div className="p-5">
          <p className="font-bold">{t("legalTitle")}</p>
          <p>{t("legal")}</p>
        </div>
      </Card>

      <p className="text-sm text-[var(--slate)]">{t("openSource")}</p>
    </div>
  );
}
