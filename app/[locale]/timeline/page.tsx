import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { Timeline } from "@/components/tools/Timeline";
import { Fees, type FeeRow } from "@/components/tools/Fees";
import { loadFees, loadSteps } from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("timeline");

  const steps = loadSteps().map((s) => ({
    id: s.id,
    order: s.order,
    name: s.name,
    what: s.what,
    durationDays: s.durationDays as never,
  }));

  // الرسوم مكانها الطبيعي هنا — جنب المرحلة اللي بتتدفع فيها.
  const fees = loadFees() as unknown as FeeRow[];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      <Timeline steps={steps} />
      <Fees fees={fees} />
      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
