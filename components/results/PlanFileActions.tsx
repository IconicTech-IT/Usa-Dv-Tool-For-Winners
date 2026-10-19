"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";

import { Icon } from "@/components/Icon";
import { Link } from "@/i18n/navigation";
import { parsePlanFile, planFileName, serializePlan } from "@/lib/calc/plan-file";
import { planStore } from "@/lib/calc/plan-store";
import type { PlanView } from "@/lib/calc/use-plan";

type Message = { kind: "ok" | "error"; text: string } | null;

function downloadPlan(view: PlanView): void {
  const blob = new Blob([serializePlan(view.plan)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = planFileName(new Date(), view.plan.name);
  link.click();
  URL.revokeObjectURL(url);
}

type Translate = ReturnType<typeof useTranslations>;

/** Adds a plan file as a new plan under its own name (it never replaces a plan) and opens it. */
async function importPlanFile(view: PlanView, file: File, t: Translate): Promise<Message> {
  const parsed = parsePlanFile(await file.text());
  if (!parsed.ok) return { kind: "error", text: t(`calc.plan.openFailures.${parsed.reason}`) };
  const name = parsed.state.name !== "" ? parsed.state.name : file.name.replace(/\.json$/i, "");
  if (!view.actions.importPlan({ ...parsed.state, name })) return { kind: "error", text: t("plans.full") };
  return { kind: "ok", text: t("plans.imported", { name: planStore.getSnapshot().plan.name }) };
}

/** Save the plan as a file, open a saved one, compare two plans, or start again. All on the device. */
export function PlanFileActions({ view }: { view: PlanView }) {
  const t = useTranslations();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<Message>(null);

  const openFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setMessage(await importPlanFile(view, file, t));
  };

  const reset = () => {
    if (window.confirm(t("results.resetConfirm"))) view.actions.reset();
  };

  return (
    <div className="no-print">
      <div className="row2" style={{ marginTop: 10 }}>
        <button type="button" className="btn sec" onClick={() => downloadPlan(view)}>
          <Icon name="download" />
          {t("results.savePlan")}
        </button>
        <button type="button" className="btn sec" onClick={() => fileInput.current?.click()}>
          <Icon name="upload" />
          {t("results.openPlan")}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => void openFile(event)}
        />
      </div>
      <div className="row2" style={{ marginTop: 10 }}>
        <Link className="btn ghost" href="/plans">
          {t("plans.manage")}
        </Link>
        <Link className="btn ghost" href="/compare">
          {t("results.compare")}
        </Link>
        <button type="button" className="btn ghost2" onClick={reset}>
          {t("results.reset")}
        </button>
      </div>
      {message === null ? null : (
        <div className={message.kind === "error" ? "errt" : "help"} role="status">
          {message.text}
        </div>
      )}
    </div>
  );
}
