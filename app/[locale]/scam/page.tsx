import { ScamScreen } from "@/components/pages/ScamScreen";
import { resolveLocale } from "@/lib/locale";
import { metadataFromMessages, type PageProps } from "@/lib/page";

export const generateMetadata = metadataFromMessages("scam", "/scam");

export default async function Page({ params }: PageProps) {
  const locale = await resolveLocale(params);
  return <ScamScreen locale={locale} />;
}
