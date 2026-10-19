import { getTranslations } from "next-intl/server";

import { Icon } from "@/components/Icon";
import type { Locale } from "@/i18n/routing";

/** The review date and the "not legal advice" warning under the public-charge title. */
export async function ChargeBanner({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "charge" });
  return (
    <>
      <div className="stamp">
        <Icon name="clock" />
        {t("stamp")} <b>{t("stampDate")}</b>
      </div>
      <div className="warn">{t("legal")}</div>
    </>
  );
}
