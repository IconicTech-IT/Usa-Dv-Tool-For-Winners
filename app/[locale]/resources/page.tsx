import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { Resources } from "@/components/Resources";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("resources");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      <Resources locale={locale as "ar" | "en"} />
    </div>
  );
}
