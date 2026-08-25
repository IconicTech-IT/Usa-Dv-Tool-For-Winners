import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/Card";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { FieldValue } from "@/components/FieldValue";
import { DocumentChecks } from "@/components/tools/DocumentChecks";
import { loadDocuments } from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("documents");
  const lang = locale as "ar" | "en";
  const docs = loadDocuments();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("lead")} />

      <DocumentChecks
        docs={docs.map((d) => ({
          id: d.id,
          name: d.name,
          why: d.why,
          watchOut: d.watchOut,
          appliesTo: d.appliesTo,
          needsTranslation: d.needsTranslation,
          validity: d.validity as never,
        }))}
      />

      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
