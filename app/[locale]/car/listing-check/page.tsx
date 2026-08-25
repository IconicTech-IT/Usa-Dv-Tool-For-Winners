import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { ListingCheck } from "@/components/tools/ListingCheck";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ListingCheckPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("listingCheck");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      <ListingCheck />
      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
