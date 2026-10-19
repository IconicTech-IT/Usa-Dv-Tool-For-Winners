"use client";

import { useTranslations } from "next-intl";

import { RatePanel } from "@/components/calc/RatePanel";
import { PlanBar } from "@/components/plans/PlanBar";
import { ScenarioList } from "@/components/calc/ScenarioList";
import { ForgotList } from "@/components/results/ForgotList";
import { PlanNameField } from "@/components/plans/PlanNameField";
import { PlanPrint } from "@/components/print/PlanPrint";
import { PlanFileActions } from "@/components/results/PlanFileActions";
import { ShareActions } from "@/components/results/ShareActions";
import { SummaryTable } from "@/components/results/SummaryTable";
import { Timeline } from "@/components/results/Timeline";
import { TransferDialog } from "@/components/transfer/TransferDialog";
import { usePlan } from "@/lib/calc/use-plan";

/** Everything the user typed, on one page: totals, the money timeline, scenarios and what is missing. */
export function ResultsScreen() {
  const t = useTranslations();
  const view = usePlan();

  return (
    <div className="calc-page">
      <PlanBar view={view} />
      <RatePanel view={view} />
      <h1>{t("results.title")}</h1>
      <p className="lead">{t("results.lead")}</p>
      <SummaryTable view={view} />
      <h2>{t("results.timelineHeading")}</h2>
      <p className="muted">{t("results.timelineLead")}</p>
      <Timeline view={view} />
      <h2>{t("runway.scenariosHeading")}</h2>
      <ScenarioList view={view} />
      <div className="fxnote">{view.result.rate === null ? t("rate.empty") : t("rate.short")}</div>
      <h2>{t("results.forgotHeading")}</h2>
      <p className="muted">{t("results.forgotLead")}</p>
      <ForgotList view={view} />
      <ShareActions view={view} />
      <h2 className="no-print">{t("results.planHeading")}</h2>
      <p className="muted no-print">{t("results.planLead")}</p>
      <div className="no-print">
        <PlanNameField view={view} />
      </div>
      <PlanFileActions view={view} />
      <div className="row2 no-print" style={{ marginTop: 10 }}>
        <TransferDialog view={view} />
      </div>
      <div className="note">{t("results.note")}</div>
      <div className="legal box">{t("footer.legal")}</div>
      <PlanPrint view={view} />
    </div>
  );
}
