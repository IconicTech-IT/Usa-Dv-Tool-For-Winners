import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { PlanState } from "@/lib/calc/model";

interface ModeSwitchProps {
  current: PlanState["uiMode"];
  /** The page the "detailed" button opens (the page the user is on when he is already detailed). */
  detailedHref: "/fees" | "/moving" | "/runway";
}

/** Quick (5 big boxes) or detailed (every item). Each mode is its own page. */
export function ModeSwitch({ current, detailedHref }: ModeSwitchProps) {
  const t = useTranslations("mode");
  const isQuick = current === "quick";
  return (
    <>
      <nav className="seg mode" aria-label={t("label")}>
        <Link
          href="/quick"
          className={isQuick ? "on" : undefined}
          aria-current={isQuick ? "page" : undefined}
        >
          {t("quick")}
        </Link>
        <Link
          href={detailedHref}
          className={isQuick ? undefined : "on"}
          aria-current={isQuick ? undefined : "page"}
        >
          {t("detailed")}
        </Link>
      </nav>
      <div className="help">{t("help")}</div>
    </>
  );
}
