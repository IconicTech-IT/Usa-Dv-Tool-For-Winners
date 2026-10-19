import { PlansScreen } from "@/components/plans/PlansScreen";
import { resolveLocale } from "@/lib/locale";
import { metadataFromMessages, type PageProps } from "@/lib/page";

export const generateMetadata = metadataFromMessages("plans", "/plans");

export default async function Page({ params }: PageProps) {
  await resolveLocale(params);
  return <PlansScreen />;
}
