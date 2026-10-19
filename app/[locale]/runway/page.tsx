import { RunwayScreen } from "@/components/calc/RunwayScreen";
import { resolveLocale } from "@/lib/locale";
import { metadataFromMessages, type PageProps } from "@/lib/page";

export const generateMetadata = metadataFromMessages("runway", "/runway");

export default async function Page({ params }: PageProps) {
  await resolveLocale(params);
  return <RunwayScreen />;
}
