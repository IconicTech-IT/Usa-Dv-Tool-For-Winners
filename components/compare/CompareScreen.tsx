"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";

import { CompareActions } from "@/components/compare/CompareActions";
import { CompareTable } from "@/components/compare/CompareTable";
import { summarizePlan, type PlanSummary } from "@/lib/calc/compare";
import { parsePlanFile } from "@/lib/calc/plan-file";
import { usePlan, type PlanView } from "@/lib/calc/use-plan";

/** What one column shows: a saved plan chosen by name, or a plan file opened for this page only. */
type Source = { kind: "saved"; id: string } | { kind: "file"; summary: PlanSummary } | null;
type Translate = ReturnType<typeof useTranslations>;

/** Name shown for a saved plan: its own, or "plan 2" from its place in the list. */
function planLabel(name: string, index: number, fallback: string): string {
  return name !== "" ? name : `${fallback} ${index + 1}`;
}

/** The numbers of one column; null while nothing is chosen in it. */
function summaryOf(source: Source, view: PlanView, t: Translate): PlanSummary | null {
  if (source === null) return null;
  if (source.kind === "file") return source.summary;
  const state = view.getPlan(source.id);
  if (state === null) return null;
  const index = view.plans.findIndex((p) => p.id === source.id);
  return summarizePlan(planLabel(state.name, index, t("plans.defaultName")), state);
}

interface PlanSlotProps {
  label: string;
  view: PlanView;
  source: Source;
  onChange: (source: Source) => void;
  onFile: (file: File) => void;
}

/** One of the two plans: pick a saved plan by name, or open a file. */
function PlanSlot({ label, view, source, onChange, onFile }: PlanSlotProps) {
  const t = useTranslations("plans");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFile(file);
  };
  const pick = (event: ChangeEvent<HTMLSelectElement>) =>
    onChange(event.target.value === "" ? null : { kind: "saved", id: event.target.value });

  return (
    <div className="plan">
      <label htmlFor={id}>
        <small>{label}</small>
      </label>
      <select id={id} className="select" value={source?.kind === "saved" ? source.id : ""} onChange={pick}>
        <option value="">{source?.kind === "file" ? source.summary.name : t("pickPlan")}</option>
        {view.plans.map((entry, index) => (
          <option key={entry.id} value={entry.id}>
            {planLabel(entry.name, index, t("defaultName"))}
          </option>
        ))}
      </select>
      <button type="button" className="btn sec" onClick={() => input.current?.click()}>
        {t("orFile")}
      </button>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={change} />
    </div>
  );
}

/** Compares any two saved plans by name (or plan files). Everything stays on the device. */
export function CompareScreen() {
  const t = useTranslations();
  const view = usePlan();
  const [slots, setSlots] = useState<[Source, Source]>([null, null]);
  const [error, setError] = useState<string | null>(null);

  const choose = (index: 0 | 1, source: Source) => {
    setError(null);
    setSlots((current) => (index === 0 ? [source, current[1]] : [current[0], source]));
  };

  const openFile = async (index: 0 | 1, file: File) => {
    const parsed = parsePlanFile(await file.text());
    if (!parsed.ok) {
      setError(t(`calc.plan.openFailures.${parsed.reason}`));
      return;
    }
    const name = parsed.state.name !== "" ? parsed.state.name : file.name.replace(/\.json$/i, "");
    choose(index, { kind: "file", summary: summarizePlan(name, parsed.state) });
  };

  const first = summaryOf(slots[0], view, t);
  const second = summaryOf(slots[1], view, t);

  return (
    <div className="calc-page">
      <h1>{t("compare.title")}</h1>
      <p className="lead">{t("compare.lead")}</p>
      <div className="plans">
        {([0, 1] as const).map((index) => (
          <PlanSlot
            key={index}
            label={t(index === 0 ? "compare.planA" : "compare.planB")}
            view={view}
            source={slots[index]}
            onChange={(source) => choose(index, source)}
            onFile={(file) => void openFile(index, file)}
          />
        ))}
      </div>
      {error === null ? null : (
        <div className="errt" role="status">
          {error}
        </div>
      )}
      <CompareTable first={first} second={second} />
      {first && second ? <CompareActions first={first} second={second} /> : null}
      <div className="note">{t("compare.note")}</div>
    </div>
  );
}
