import { TextPage } from "@/components/content/TextPage";
import { ChargeBanner } from "@/components/pages/ChargeBanner";
import { resolveLocale } from "@/lib/locale";
import { metadataFromMessages, type PageProps } from "@/lib/page";

export const generateMetadata = metadataFromMessages("charge", "/charge");

export default async function Page({ params }: PageProps) {
  const locale = await resolveLocale(params);
  return (
    <TextPage locale={locale} namespace="charge" content="charge" before={<ChargeBanner locale={locale} />} />
  );
}
