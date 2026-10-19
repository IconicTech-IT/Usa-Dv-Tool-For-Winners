import { getTranslations } from "next-intl/server";

import { Icon } from "@/components/Icon";
import { RuleNote } from "@/components/guide/RuleNote";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { findItem } from "@/lib/calc/catalog";
import { CALCULATOR_PATH } from "@/lib/calc/routes";
import { guideKind, guideText } from "@/lib/guide/copy";
import { guideSitesFor, type GuideSite } from "@/lib/guide/links";
import { notesForItem } from "@/lib/guide/notes";

interface GuideScreenProps {
  itemId: string;
  locale: Locale;
}

/** "How do I find this price?" for one cost item: the method and real sources, never a number. */
export async function GuideScreen({ itemId, locale }: GuideScreenProps) {
  const t = await getTranslations({ locale });
  const item = findItem(itemId);
  if (!item) return null;

  const text = guideText(t, itemId);
  const kind = guideKind(itemId);
  const back = CALCULATOR_PATH[item.calculator];

  return (
    <>
      <Link className="back" href={back}>
        <Icon name="back" />
        {t("common.back")}
      </Link>
      <h1>{text.title}</h1>
      <p className="lead">{text.lead}</p>
      {notesForItem(itemId, locale).map((note) => (
        <RuleNote key={note.id} note={note} sourceWord={t("guide.source")} />
      ))}
      <h2>{t("guide.how")}</h2>
      <div className="steps">
        {text.steps.map((step) => (
          <div key={step}>{step}</div>
        ))}
      </div>
      <h2>{t("guide.links")}</h2>
      <div className="links">
        {guideSitesFor(itemId).map((site) => (
          <SourceLink key={site.id} site={site} locale={locale} officialLabel={t("guide.official")} />
        ))}
      </div>
      {itemId === "passport" || itemId === "familyPassports" ? (
        <div className="note">{t("guideNotes.passport")}</div>
      ) : null}
      {kind === "health" ? (
        <>
          <div className="note">{t("guideHealth.state")}</div>
          <div className="note">
            <Link href="/charge">{t("guideNotes.charge")}</Link>
          </div>
        </>
      ) : null}
      <div className="note">{t("guide.note")}</div>
      <Link className="btn pr" href={back} style={{ marginTop: 18 }}>
        {t("guide.backToCalculator")}
      </Link>
    </>
  );
}

interface SourceLinkProps {
  site: GuideSite;
  locale: Locale;
  officialLabel: string;
}

function SourceLink({ site, locale, officialLabel }: SourceLinkProps) {
  const host = new URL(site.url).hostname.replace(/^www\./, "");
  return (
    <div>
      <a className="lnk" href={site.url} target="_blank" rel="noopener noreferrer">
        <span>
          {site.name[locale]}
          {site.official ? ` · ${officialLabel}` : ""}
          <small>{host}</small>
        </span>
        <Icon name="external" />
      </a>
      <div className="help">{site.what[locale]}</div>
      {site.watch ? <div className="warn">{site.watch[locale]}</div> : null}
    </div>
  );
}
