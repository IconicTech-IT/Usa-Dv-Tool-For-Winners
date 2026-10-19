import { getTranslations } from "next-intl/server";

import { Icon } from "@/components/Icon";
import type { Locale } from "@/i18n/routing";
import { guideSitesFor } from "@/lib/guide/links";

/** The official pages the scam page points to. Sources of money and results only, never an office. */
const STATUS_CHECK_URL = "https://dvprogram.state.gov/ESC/";
const FRAUD_WARNING_URL = "https://travel.state.gov/dvfraud";
/** The final rule that set the registration fee (Federal Register, 16 September 2025). */
const FEE_RULE_URL = "https://public-inspection.federalregister.gov/2025-17851.pdf";

const FACT_NUMBERS = ["1", "2", "3", "4", "5"] as const;
const SIGN_NUMBERS = ["1", "2", "3", "4"] as const;

interface OfficialLink {
  key: "entry" | "status" | "fraud" | "fee";
  url: string;
}

/** The official lottery page comes from the guide sources, so there is one place to fix its address. */
function officialLinks(): OfficialLink[] {
  const lotteryPage = guideSitesFor("entryPhotos").find((site) => site.id === "stateDvPage");
  return [
    ...(lotteryPage ? [{ key: "entry" as const, url: lotteryPage.url }] : []),
    { key: "status", url: STATUS_CHECK_URL },
    { key: "fraud", url: FRAUD_WARNING_URL },
    { key: "fee", url: FEE_RULE_URL },
  ];
}

/** Protect yourself from scams: the official fee, what to check, the signs, and official links only. */
export async function ScamScreen({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "scam" });

  return (
    <>
      <h1>{t("title")}</h1>
      <p className="lead">{t("lead")}</p>
      <div className="scam">
        <Icon name="warning" />
        <span>{t("fee")}</span>
      </div>
      <div className="help">{t("feeSource")}</div>
      <h2>{t("factsHeading")}</h2>
      <div className="facts ok">
        {FACT_NUMBERS.map((n) => (
          <div key={n}>
            <Icon name="check" />
            <span>{t(`facts.${n}`)}</span>
          </div>
        ))}
      </div>
      <h2>{t("signsHeading")}</h2>
      <div className="facts bad">
        {SIGN_NUMBERS.map((n) => (
          <div key={n}>
            <Icon name="cross" />
            <span>{t(`signs.${n}`)}</span>
          </div>
        ))}
      </div>
      <h2>{t("linksHeading")}</h2>
      <div className="links">
        {officialLinks().map((link) => (
          <a key={link.key} className="lnk" href={link.url} target="_blank" rel="noopener noreferrer">
            <span>
              {t(`links.${link.key}`)}
              <small>{new URL(link.url).hostname.replace(/^www\./, "")}</small>
            </span>
            <Icon name="external" />
          </a>
        ))}
      </div>
      <div className="note">{t("note")}</div>
    </>
  );
}
