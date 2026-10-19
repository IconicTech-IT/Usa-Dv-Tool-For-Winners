import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Icon, type IconName } from "@/components/Icon";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

interface HomeProps {
  params: Promise<{ locale: string }>;
}

interface CardLink {
  id: "fees" | "moving" | "runway" | "results" | "charge" | "english" | "scam" | "compare" | "plans";
  href: string;
  icon: IconName;
}

const CALCULATORS: readonly CardLink[] = [
  { id: "fees", href: "/fees", icon: "document" },
  { id: "moving", href: "/moving", icon: "home" },
  { id: "runway", href: "/runway", icon: "chart" },
  { id: "results", href: "/results", icon: "table" },
];

const PAGES: readonly CardLink[] = [
  { id: "charge", href: "/charge", icon: "shield" },
  { id: "english", href: "/english", icon: "chat" },
  { id: "scam", href: "/scam", icon: "warning" },
  { id: "plans", href: "/plans", icon: "document" },
  { id: "compare", href: "/compare", icon: "compare" },
];

export async function generateMetadata({ params }: HomeProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "", title: t("title"), description: t("description") });
}

export default async function HomePage({ params }: HomeProps) {
  await resolveLocale(params);
  const t = await getTranslations("home");

  const renderCard = ({ id, href, icon }: CardLink) => (
    <Link key={id} href={href} className="card calc">
      <span className="ic">
        <Icon name={icon} />
      </span>
      <span className="t">
        <h3>{t(`cards.${id}.title`)}</h3>
        <p>{t(`cards.${id}.text`)}</p>
      </span>
      <span className="chev" aria-hidden="true">
        ‹
      </span>
    </Link>
  );

  return (
    <>
      <div className="hero">
        <div>
          <h1>{t("title")}</h1>
          <p className="lead">{t("lead")}</p>
          <p className="muted mt-8">{t("rule")}</p>
        </div>
        <div className="compassbig" aria-hidden="true">
          <Icon name="compass" strokeWidth={1.5} />
        </div>
      </div>
      <Link href="/setup" className="btn pr mt-16">
        {t("start")}
      </Link>
      <div className="scam" role="note">
        <Icon name="warning" />
        <span>
          {t("scamBanner")} <Link href="/scam">{t("scamMore")}</Link>
        </span>
      </div>
      <h2>{t("calculators")}</h2>
      <div className="cards">{CALCULATORS.map(renderCard)}</div>
      <div className="note">{t("note")}</div>
      <h2>{t("pages")}</h2>
      <div className="cards pages">{PAGES.map(renderCard)}</div>
    </>
  );
}
