import { getTranslations } from "next-intl/server";

import { Icon } from "@/components/Icon";

/** The one-line privacy promise shown under the header on every page. */
export async function PrivacyStrip() {
  const t = await getTranslations("privacy");
  return (
    <section className="privacy" aria-label={t("label")}>
      <Icon name="lock" />
      {t("line")}
    </section>
  );
}
