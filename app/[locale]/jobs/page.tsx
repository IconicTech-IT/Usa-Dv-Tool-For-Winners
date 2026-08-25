import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { JobsTable } from "@/components/tools/JobsTable";
import { loadJobs } from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function JobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("jobs");

  const jobs = loadJobs().map((j) => ({
    slug: j.slug,
    name: j.name,
    category: j.category,
    summary: j.summary,
    needsCar: j.needsCar as never,
    needsEnglish: j.needsEnglish as never,
    activationDays: j.activationDays as never,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      <JobsTable jobs={jobs} />
      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
