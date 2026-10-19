"use client";

import { useTranslations } from "next-intl";

import { AmountInput } from "@/components/calc/AmountInput";
import { Stepper } from "@/components/calc/Stepper";
import { findItem } from "@/lib/calc/catalog";
import { MAX_REGISTRATIONS, REGISTRATION_FEE_ITEM } from "@/lib/calc/model";
import { hasGuide } from "@/lib/guide/links";
import type { PlanView } from "@/lib/calc/use-plan";

interface ItemFieldProps {
  view: PlanView;
  id: string;
  /** "item" is a box of the detailed mode, "quick" a box of the quick mode. */
  kind: "item" | "quick";
}

/** A money box of the plan, wired to the plan store. */
export function ItemField({ view, id, kind }: ItemFieldProps) {
  const t = useTranslations("calc.items");
  const fees = useTranslations("fees");
  const def = findItem(id);
  const field = kind === "quick" ? view.plan.quick[id] : view.plan.items[id];
  if (!def || !field) return null;

  const result = view.result.items.find((item) => item.id === id);
  const change = kind === "quick" ? view.actions.setQuick : view.actions.setItem;

  const box = (
    <AmountInput
      label={t(id)}
      field={field}
      localCode={view.plan.localCurrency}
      onChange={(patch) => change(id, patch)}
      scaling={def.scaling}
      hasToggle={def.toggle === true}
      guideItemId={hasGuide(id) ? id : undefined}
      invalid={result?.invalid}
      needsRate={result?.needsRate}
    />
  );
  if (id !== REGISTRATION_FEE_ITEM) return box;

  // The fee is paid once per entry, so the box carries the number of entries.
  return (
    <>
      {box}
      <Stepper
        label={fees("registrations")}
        help={fees("registrationsHelp")}
        value={view.plan.registrations}
        min={1}
        max={MAX_REGISTRATIONS}
        onChange={view.actions.setRegistrations}
      />
    </>
  );
}
