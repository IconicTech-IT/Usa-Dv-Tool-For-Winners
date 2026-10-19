"use client";

import { useTranslations } from "next-intl";

import { DualAmount } from "@/components/calc/DualAmount";
import { Link } from "@/i18n/navigation";
import type { PlanView } from "@/lib/calc/use-plan";

interface StickyTotalProps {
  view: PlanView;
  /** The next page of the flow. */
  nextHref: "/moving" | "/runway" | "/results";
}

/** The running one-time total, always at the bottom of the screen, with the way on. */
export function StickyTotal({ view, nextHref }: StickyTotalProps) {
  const t = useTranslations("common");
  return (
    <div className="total" role="region" aria-label={t("totalSoFar")}>
      <div className="in">
        <span>
          <span className="help">{t("totalSoFar")}</span>
          <span className="v">
            <DualAmount
              cents={view.result.oneTimeCents}
              result={view.result}
              localCode={view.plan.localCurrency}
            />
          </span>
        </span>
        <Link className="btn pr" href={nextHref}>
          {t("next")}
        </Link>
      </div>
    </div>
  );
}
