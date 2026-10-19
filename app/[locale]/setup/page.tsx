import { SetupScreen } from "@/components/calc/SetupScreen";
import { resolveLocale } from "@/lib/locale";
import { metadataFromMessages, type PageProps } from "@/lib/page";

export const generateMetadata = metadataFromMessages("setup", "/setup");

export default async function Page({ params }: PageProps) {
  await resolveLocale(params);
  return <SetupScreen />;
}
