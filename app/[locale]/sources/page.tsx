import { SourcesScreen } from "@/components/pages/SourcesScreen";
import { resolveLocale } from "@/lib/locale";
import { metadataFromMessages, type PageProps } from "@/lib/page";

export const generateMetadata = metadataFromMessages("pages.sources", "/sources");

export default async function Page({ params }: PageProps) {
  const locale = await resolveLocale(params);
  return <SourcesScreen locale={locale} />;
}
