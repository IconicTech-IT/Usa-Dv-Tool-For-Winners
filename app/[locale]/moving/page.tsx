import { GroupedCalculatorScreen } from "@/components/calc/GroupedCalculatorScreen";
import { resolveLocale } from "@/lib/locale";
import { metadataFromMessages, type PageProps } from "@/lib/page";

export const generateMetadata = metadataFromMessages("moving", "/moving");

export default async function Page({ params }: PageProps) {
  await resolveLocale(params);
  return <GroupedCalculatorScreen calculator="moving" />;
}
