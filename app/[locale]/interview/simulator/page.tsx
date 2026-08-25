import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { Simulator } from "@/components/tools/Simulator";
import { loadInterview } from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function SimulatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("simulator");

  const questions = loadInterview().categories.flatMap((c) => c.questions);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      <Simulator questions={questions} />
      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
