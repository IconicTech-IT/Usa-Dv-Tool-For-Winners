"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";

import { CompareTable } from "@/components/compare/CompareTable";
import { useNumberLocale } from "@/components/calc/format";
import { Icon } from "@/components/Icon";
import { summarizePlan, type PlanSummary } from "@/lib/calc/compare";
import { formatMoney } from "@/lib/calc/money";
import { parsePlanFile } from "@/lib/calc/plan-file";
import { whatsappUrl } from "@/lib/calc/summary";

type Slot = PlanSummary | null;

interface PlanSlotProps {
  label: string;
  summary: Slot;
  onOpen: (file: File) => void;
}

/** One of the two plans: its name and a button to open a saved plan file into it. */
function PlanSlot({ label, summary, onOpen }: PlanSlotProps) {
  const t = useTranslations("compare");
  const input = useRef<HTMLInputElement>(null);
  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onOpen(file);
  };
  return (
    <div className="plan">
      <small>{label}</small>
      <b>{summary === null ? "—" : summary.name}</b>
      <button type="button" className="btn sec" onClick={() => input.current?.click()}>
        {t("openFile")}
      </button>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={change} />
    </div>
  );
}

/** Opens two saved plans and shows them side by side. Both files stay on the device. */
export function CompareScreen() {
  const t = useTranslations();
  const locale = useNumberLocale();
  const [slots, setSlots] = useState<[Slot, Slot]>([null, null]);
  const [error, setError] = useState<string | null>(null);

  const open = async (index: 0 | 1, file: File) => {
    const parsed = parsePlanFile(await file.text());
    if (!parsed.ok) {
      setError(t(`calc.plan.openFailures.${parsed.reason}`));
      return;
    }
    setError(null);
    const summary = summarizePlan(file.name, parsed.state);
    setSlots((current) => (index === 0 ? [summary, current[1]] : [current[0], summary]));
  };

  const [first, second] = slots;
  const dollars = (cents: bigint) => `$ ${formatMoney(cents, locale)}`;
  const shareText =
    first && second
      ? [
          t("results.shareHeader"),
          `${first.name}: ${dollars(first.stillToSaveCents)}`,
          `${second.name}: ${dollars(second.stillToSaveCents)}`,
        ].join("\n")
      : null;

  return (
    <div className="calc-page">
      <h1>{t("compare.title")}</h1>
      <p className="lead">{t("compare.lead")}</p>
      <div className="plans">
        <PlanSlot label={t("compare.planA")} summary={first} onOpen={(file) => void open(0, file)} />
        <PlanSlot label={t("compare.planB")} summary={second} onOpen={(file) => void open(1, file)} />
      </div>
      {error === null ? null : (
        <div className="errt" role="status">
          {error}
        </div>
      )}
      <CompareTable first={first} second={second} />
      {first && second ? (
        <div className="row2 no-print" style={{ marginTop: 18 }}>
          <button type="button" className="btn pr" onClick={() => window.print()}>
            <Icon name="print" />
            {t("results.print")}
          </button>
          {shareText === null ? null : (
            <a className="btn wa" href={whatsappUrl(shareText)} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" />
              {t("results.whatsapp")}
            </a>
          )}
        </div>
      ) : null}
      <div className="note">{t("compare.note")}</div>
    </div>
  );
}
