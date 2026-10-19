import { getTranslations } from "next-intl/server";

import { Icon } from "@/components/Icon";

/** The one-line privacy promise shown under the header on every page. */
export async function PrivacyStrip() {
  const t = await getTranslations("privacy");
  return (
    <div className="privacy">
      <Icon name="lock" />
      {t("line")}
    </div>
  );
}
