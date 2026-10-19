"use client";

import { useTranslations } from "next-intl";

import { DualAmount, UsdAmount } from "@/components/calc/DualAmount";
import { useNumberLocale } from "@/components/calc/format";
import { SCENARIO_START_MONTHS } from "@/lib/calc/compute";
import { ZERO_CENTS } from "@/lib/calc/money";
import { formatNumber } from "@/lib/calc/parse-amount";
import { scenarioTotalCents } from "@/lib/calc/summary";
import type { PlanView } from "@/lib/calc/use-plan";

interface ScenarioListProps {
  view: PlanView;
}

/** The four "when does the job start" scenarios: what is needed in all and what is still to save. */
export function ScenarioList({ view }: ScenarioListProps) {
  const t = useTranslations();
  const locale = useNumberLocale();
  const { result } = view;
  const localCode = view.plan.localCurrency;
  const safest = SCENARIO_START_MONTHS[SCENARIO_START_MONTHS.length - 1];

  return (
    <div className="scen">
      {result.follow === null ? null : (
        <div className="sc">
          <span className="k">
            {t("runway.arrivalTitle", { months: formatNumber(result.follow.months, locale, 0) })}
            <small>{t("runway.arrivalHint")}</small>
          </span>
          <span className="v dual">
            <DualAmount cents={result.follow.cashByArrivalCents} result={result} localCode={localCode} />
          </span>
        </div>
      )}
      {result.scenarios.map((scenario) => {
        const month = scenario.startMonth;
        const hasSurplus = scenario.surplusCents > ZERO_CENTS;
        return (
          <div key={month} className={month === safest ? "sc hi" : "sc"}>
            <span className="k">
              {t(`calc.scenarios.start${month}`)}
              <small>{t(`calc.scenarioHints.start${month}`)}</small>
            </span>
            <span className="v dual">
              <DualAmount
                cents={scenarioTotalCents(scenario, result)}
                result={result}
                localCode={localCode}
              />
              <span className="need">
                {hasSurplus ? t("runway.surplus") : t("runway.stillToSave")}:{" "}
                <UsdAmount cents={hasSurplus ? scenario.surplusCents : scenario.shortfallCents} />
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
