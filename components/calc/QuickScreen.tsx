"use client";

import { useTranslations } from "next-intl";

import { DualAmount } from "@/components/calc/DualAmount";
import { ItemField } from "@/components/calc/ItemField";
import { ModeSwitch } from "@/components/calc/ModeSwitch";
import { RatePanel } from "@/components/calc/RatePanel";
import { PlanBar } from "@/components/plans/PlanBar";
import { ScenarioList } from "@/components/calc/ScenarioList";
import { StickyTotal } from "@/components/calc/StickyTotal";
import { TopField } from "@/components/calc/TopField";
import { useRouteMode } from "@/components/calc/use-route-mode";
import { usePlan } from "@/lib/calc/use-plan";

const ONE_TIME_BOXES = ["quickPaperwork", "quickTravel", "quickHousing", "quickCar"] as const;

/** Quick mode: five big boxes and the scenarios. */
export function QuickScreen() {
  const t = useTranslations("quick");
  const all = useTranslations();
  const view = usePlan();
  useRouteMode(view, "quick");
  const { plan, result } = view;

  return (
    <div className="calc-page">
      <PlanBar view={view} />
      <RatePanel view={view} />
      <h1>{t("title")}</h1>
      <p className="lead">{t("lead")}</p>
      <ModeSwitch current="quick" detailedHref="/fees" />
      <section className="card" style={{ marginTop: 14 }}>
        {ONE_TIME_BOXES.map((id) => (
          <ItemField key={id} view={view} id={id} kind="quick" />
        ))}
        <div className="subtot">
          <span>{all("results.oneOff")}</span>
          <DualAmount cents={result.oneTimeCents} result={result} localCode={plan.localCurrency} />
        </div>
      </section>
      <section className="card" style={{ marginTop: 12 }}>
        <ItemField view={view} id="quickMonthly" kind="quick" />
        <TopField view={view} field="savings" />
      </section>
      <h2>{all("runway.scenariosHeading")}</h2>
      <ScenarioList view={view} />
      <div className="note">{t("note")}</div>
      <StickyTotal view={view} nextHref="/results" />
    </div>
  );
}
