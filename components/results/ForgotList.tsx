"use client";

import { useTranslations } from "next-intl";

import { useNumberLocale } from "@/components/calc/format";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/calc/parse-amount";
import { pathForItem } from "@/lib/calc/routes";
import { forgottenByStage } from "@/lib/calc/summary";
import type { PlanView } from "@/lib/calc/use-plan";

/** How many empty boxes are named under a stage before the rest is cut with an ellipsis. */
const NAMED_BOXES = 3;

/** The stages with empty boxes, with a link to fill them. Nothing is required: it is a reminder. */
export function ForgotList({ view }: { view: PlanView }) {
  const t = useTranslations();
  const locale = useNumberLocale();
  const separator = locale === "ar" ? "، " : ", ";
  const forgotten = forgottenByStage(view.result);

  if (forgotten.length === 0) return <div className="note">{t("results.forgotNone")}</div>;

  return (
    <div className="card forgot" style={{ marginTop: 10 }}>
      {forgotten.map(({ stage, itemIds }) => {
        const names = itemIds.slice(0, NAMED_BOXES).map((id) => t(`calc.items.${id}`));
        const more = itemIds.length > NAMED_BOXES ? "…" : "";
        const first = itemIds[0];
        return (
          <div key={stage} className="row">
            <span>
              <b>{t(`calc.timeline.${stage}.title`)}</b>
              <small>
                {names.join(separator)}
                {more}
              </small>
            </span>
            <span className="cnt">
              {t("results.forgotCount", { count: formatNumber(itemIds.length, locale, 0) })}
            </span>
            {first === undefined ? null : (
              <Link className="fill" href={pathForItem(first, view.plan.uiMode)}>
                {t("common.fill")}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
