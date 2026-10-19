import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { CONTACT_EMAIL } from "@/lib/site";

/** Complaints email, the legal line and the pages every visitor may need. */
export async function SiteFooter() {
  const t = await getTranslations("footer");
  return (
    <footer>
      <div className="mail">
        {t("mailBefore")}{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="ltr">
          {CONTACT_EMAIL}
        </a>
      </div>
      <div>
        {t("line")} {t("offline")}
      </div>
      <div className="legal">{t("legal")}</div>
      <nav className="links2" aria-label={t("pagesLabel")}>
        <Link href="/about">{t("about")}</Link>
        <Link href="/privacy">{t("privacy")}</Link>
        <Link href="/sources">{t("sources")}</Link>
        <Link href="/scam">{t("scam")}</Link>
      </nav>
    </footer>
  );
}
