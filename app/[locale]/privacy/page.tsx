import { TextPage } from "@/components/content/TextPage";
import { resolveLocale } from "@/lib/locale";
import { metadataFromMessages, type PageProps } from "@/lib/page";

export const generateMetadata = metadataFromMessages("pages.privacy", "/privacy");

export default async function Page({ params }: PageProps) {
  const locale = await resolveLocale(params);
  return <TextPage locale={locale} namespace="pages.privacy" content="privacy" />;
}
