"use client";

import { useTranslations } from "next-intl";

import { DualAmount, UsdAmount } from "@/components/calc/DualAmount";
import type { PlanView } from "@/lib/calc/use-plan";

/** The money timeline: what must be ready at each stage, and the running total up to it. */
export function Timeline({ view }: { view: PlanView }) {
  const t = useTranslations();
  const { result, plan } = view;

  return (
    <div className="card tl">
      {result.timeline.map((entry) => (
        <div key={entry.stage} className={entry.stage === "monthly" ? "it mo" : "it"}>
          <span className="dot" />
          <span className="k">
            {t(`calc.timeline.${entry.stage}.title`)}
            <small>{t(`calc.timeline.${entry.stage}.text`)}</small>
          </span>
          <span className="v">
            <DualAmount cents={entry.stageCents} result={result} localCode={plan.localCurrency} />
            <span className="cum">
              {t("common.cumulative")}: <UsdAmount cents={entry.cumulativeCents} />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
