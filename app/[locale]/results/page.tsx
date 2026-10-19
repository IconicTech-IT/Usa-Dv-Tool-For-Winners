import { ResultsScreen } from "@/components/results/ResultsScreen";
import { resolveLocale } from "@/lib/locale";
import { metadataFromMessages, type PageProps } from "@/lib/page";

export const generateMetadata = metadataFromMessages("results", "/results");

export default async function Page({ params }: PageProps) {
  await resolveLocale(params);
  return <ResultsScreen />;
}
