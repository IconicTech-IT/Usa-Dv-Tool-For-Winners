import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, ToolDisclaimer } from "@/components/ui";
import { Checklist } from "@/components/tools/Checklist";
import { loadChecklists } from "@/lib/content/load";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function StepsChecklistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("checklist");

  const lists = loadChecklists();

  return (
    <div className="space-y-10">
      <PageHeader title={t("stepsTitle")} lead={t("stepsLead")} />

      {lists.map((list) => (
        <section key={list.id} className="space-y-4">
          <h2 className="text-xl font-bold">{list.name[locale as "ar" | "en"] || list.name.ar}</h2>
          <Checklist
            listId={list.id}
            items={list.items.map((i) => ({
              id: i.id,
              title: i.title,
              detail: i.detail,
              status: i.status,
              verifyNote: i.verifyNote,
            }))}
          />
        </section>
      ))}

      <ToolDisclaimer text={t("disclaimer")} />
    </div>
  );
}
