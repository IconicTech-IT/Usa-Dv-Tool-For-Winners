import { QuickScreen } from "@/components/calc/QuickScreen";
import { resolveLocale } from "@/lib/locale";
import { metadataFromMessages, type PageProps } from "@/lib/page";

export const generateMetadata = metadataFromMessages("quick", "/quick");

export default async function Page({ params }: PageProps) {
  await resolveLocale(params);
  return <QuickScreen />;
}
