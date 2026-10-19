"use client";

import { useTranslations } from "next-intl";

import { AgesNudge } from "@/components/calc/AgesNudge";
import { MonthlyCards } from "@/components/calc/MonthlyCards";
import { ModeSwitch } from "@/components/calc/ModeSwitch";
import { RatePanel } from "@/components/calc/RatePanel";
import { PlanBar } from "@/components/plans/PlanBar";
import { ScenarioList } from "@/components/calc/ScenarioList";
import { Stepper } from "@/components/calc/Stepper";
import { StickyTotal } from "@/components/calc/StickyTotal";
import { TopField } from "@/components/calc/TopField";
import { useRouteMode } from "@/components/calc/use-route-mode";
import { bufferMonthsOf, MAX_BUFFER_MONTHS } from "@/lib/calc/plan-actions";
import { usePlan } from "@/lib/calc/use-plan";

/** Monthly costs, income and savings, and how much is needed for each job-start scenario. */
export function RunwayScreen() {
  const t = useTranslations("runway");
  const view = usePlan();
  useRouteMode(view, "detailed");
  const { plan, actions } = view;

  return (
    <div className="calc-page">
      <PlanBar view={view} />
      <RatePanel view={view} />
      <h1>{t("title")}</h1>
      <p className="lead">{t("lead")}</p>
      <ModeSwitch current="detailed" detailedHref="/runway" />
      <AgesNudge view={view} />
      <MonthlyCards view={view} />
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
