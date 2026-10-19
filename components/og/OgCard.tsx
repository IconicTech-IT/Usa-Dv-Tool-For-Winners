import { getTranslations } from "next-intl/server";

import { Icon } from "@/components/Icon";
import type { Locale } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";

/** The share card (1200 by 630): the site name, a line about it and three promises. Photographed into a PNG. */
export async function OgCard({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "og" });
  return (
    <div className="og" id="og-card">
      <div className="ring" />
      <div className="og-brand">
        <span className="mark">
          <Icon name="compass" />
        </span>
        DV Compass
      </div>
      <div>
        <h1>{t("title")}</h1>
        <div className="sub">{t("sub")}</div>
      </div>
      <div className="chips">
        <span className="chip">{t("chip1")}</span>
        <span className="chip">{t("chip2")}</span>
        <span className="chip">{t("chip3")}</span>
      </div>
      <div className="url-wrap">
        <div className="url">{new URL(SITE_URL).host}</div>
      </div>
    </div>
  );
}
