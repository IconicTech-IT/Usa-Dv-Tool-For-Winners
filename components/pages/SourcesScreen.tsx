import { getTranslations } from "next-intl/server";

import { Inline } from "@/components/content/Inline";
import { Icon } from "@/components/Icon";
import type { Locale } from "@/i18n/routing";
import { allGuideSites, GUIDE_LINKS_LAST_CHECKED, type GuideSite } from "@/lib/guide/links";

/** Every source the site sends people to, official first, with the date a person last opened them all. */
export async function SourcesScreen({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "pages.sources" });
  const sites = allGuideSites();
  const official = sites.filter((site) => site.official);
  const others = sites.filter((site) => !site.official);

  return (
    <>
      <h1>{t("title")}</h1>
      <p className="lead">{t("lead")}</p>
      <div className="stamp">
        <Icon name="clock" />
        {GUIDE_LINKS_LAST_CHECKED === null ? (
          t("neverChecked")
        ) : (
          <>
            {t("lastChecked")} <b className="num">{GUIDE_LINKS_LAST_CHECKED}</b>
          </>
        )}
      </div>
      <SiteList heading={t("official")} sites={official} locale={locale} />
      <SiteList heading={t("others")} sites={others} locale={locale} />
      <div className="note">{t("note")}</div>
    </>
  );
}

interface SiteListProps {
  heading: string;
  sites: GuideSite[];
  locale: Locale;
}

function SiteList({ heading, sites, locale }: SiteListProps) {
  if (sites.length === 0) return null;
  return (
    <section>
      <h2>{heading}</h2>
      <div className="links">
        {sites.map((site) => (
          <div key={site.id}>
            <a className="lnk" href={site.url} target="_blank" rel="noopener noreferrer">
              <span>
                <Inline text={site.name[locale]} />
                <small>{new URL(site.url).hostname.replace(/^www\./, "")}</small>
              </span>
              <Icon name="external" />
            </a>
            <div className="help">
              <Inline text={site.what[locale]} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
