"use client";

import { useTranslations } from "next-intl";

import { DualAmount } from "@/components/calc/DualAmount";
import { ItemField } from "@/components/calc/ItemField";
import { ModeSwitch } from "@/components/calc/ModeSwitch";
import { RatePanel } from "@/components/calc/RatePanel";
import { PlanBar } from "@/components/plans/PlanBar";
import { ScenarioList } from "@/components/calc/ScenarioList";
import { Stepper } from "@/components/calc/Stepper";
import { StickyTotal } from "@/components/calc/StickyTotal";
import { TopField } from "@/components/calc/TopField";
import { useRouteMode } from "@/components/calc/use-route-mode";
import { itemsOfCalculator } from "@/lib/calc/catalog";
import { bufferMonthsOf, MAX_BUFFER_MONTHS } from "@/lib/calc/plan-actions";
import { usePlan } from "@/lib/calc/use-plan";

const MONTHLY_ITEMS = itemsOfCalculator("monthly");

/** Monthly costs, income and savings, and how much is needed for each job-start scenario. */
export function RunwayScreen() {
  const t = useTranslations("runway");
  const stages = useTranslations("calc.stages");
  const view = usePlan();
  useRouteMode(view, "detailed");
  const { plan, result, actions } = view;

  return (
    <div className="calc-page">
      <PlanBar view={view} />
      <RatePanel view={view} />
      <h1>{t("title")}</h1>
      <p className="lead">{t("lead")}</p>
      <ModeSwitch current="detailed" detailedHref="/runway" />
      <section className="card" style={{ marginTop: 14 }}>
        <h2 className="card-title">
          {t("monthlyHeading")} · <b className="when">{stages("monthly")}</b>
        </h2>
        {MONTHLY_ITEMS.map((item) => (
          <ItemField key={item.id} view={view} id={item.id} kind="item" />
        ))}
        {result.follow === null ? null : (
          <div className="subtot">
            <span>{t("monthlyAlone")}</span>
            <DualAmount
              cents={result.follow.aloneMonthlyCents}
              result={result}
              localCode={plan.localCurrency}
            />
          </div>
        )}
        <div className="subtot">
          <span>{result.follow === null ? t("monthlyTotal") : t("monthlyFamily")}</span>
          <DualAmount cents={result.monthlyCents} result={result} localCode={plan.localCurrency} />
        </div>
      </section>
      <h2>{t("incomeHeading")}</h2>
      <p className="muted">{t("incomeLead")}</p>
      <section className="card" style={{ marginTop: 10 }}>
        <TopField view={view} field="income" />
        <TopField view={view} field="spouseIncome" />
        <TopField view={view} field="savings" />
        <Stepper
          label={t("buffer")}
          help={t("bufferHelp")}
          value={bufferMonthsOf(plan.bufferMonths)}
          min={0}
          max={MAX_BUFFER_MONTHS}
          onChange={(months) => actions.setBufferMonths(String(months))}
        />
      </section>
      <h2>{t("scenariosHeading")}</h2>
      <p className="muted">{t("scenariosLead")}</p>
      <ScenarioList view={view} />
      <div className="note">{t("note")}</div>
      <StickyTotal view={view} nextHref="/results" />
    </div>
  );
}
