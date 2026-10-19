import { CompareScreen } from "@/components/compare/CompareScreen";
import { resolveLocale } from "@/lib/locale";
import { metadataFromMessages, type PageProps } from "@/lib/page";

export const generateMetadata = metadataFromMessages("compare", "/compare");

export default async function Page({ params }: PageProps) {
  await resolveLocale(params);
  return <CompareScreen />;
}
