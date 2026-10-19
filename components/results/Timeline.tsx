"use client";

import { useTranslations } from "next-intl";

import { DualAmount, UsdAmount } from "@/components/calc/DualAmount";
import { useNumberLocale } from "@/components/calc/format";
import { formatNumber } from "@/lib/calc/parse-amount";
import { timelineKeyOf } from "@/lib/calc/summary";
import type { PlanView } from "@/lib/calc/use-plan";

/** The money timeline: what must be ready at each stage, and the running total up to it. */
export function Timeline({ view }: { view: PlanView }) {
  const t = useTranslations();
  const { result, plan } = view;
  const locale = useNumberLocale();
  const months = formatNumber(result.follow?.months ?? 0, locale, 0);

  return (
    <div className="card tl">
      {result.timeline.map((entry) => {
        const key = timelineKeyOf(entry.stage, result.follow !== null);
        return (
          <div key={entry.stage} className={entry.stage === "monthly" ? "it mo" : "it"}>
            <span className="dot" />
            <span className="k">
              {t(`calc.timeline.${key}.title`, { months })}
              <small>{t(`calc.timeline.${key}.text`)}</small>
            </span>
            <span className="v">
              <DualAmount cents={entry.stageCents} result={result} localCode={plan.localCurrency} />
              <span className="cum">
                {t("common.cumulative")}: <UsdAmount cents={entry.cumulativeCents} />
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
