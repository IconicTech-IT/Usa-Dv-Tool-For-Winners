import { TextPage } from "@/components/content/TextPage";
import { resolveLocale } from "@/lib/locale";
import { metadataFromMessages, type PageProps } from "@/lib/page";

export const generateMetadata = metadataFromMessages("pages.about", "/about");

export default async function Page({ params }: PageProps) {
  const locale = await resolveLocale(params);
  return <TextPage locale={locale} namespace="pages.about" content="about" />;
}
