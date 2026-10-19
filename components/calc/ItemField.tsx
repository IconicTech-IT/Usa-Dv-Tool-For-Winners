"use client";

import { useTranslations } from "next-intl";

import { AmountInput } from "@/components/calc/AmountInput";
import { Stepper } from "@/components/calc/Stepper";
import { LineTotal } from "@/components/calc/LineTotal";
import { countUnitOf, findItem, type ItemDef } from "@/lib/calc/catalog";
import { effectiveScaling, type ItemResult } from "@/lib/calc/compute";
import { MAX_REGISTRATIONS, REGISTRATION_FEE_ITEM, type AmountField } from "@/lib/calc/model";
import { hasGuide } from "@/lib/guide/links";
import type { PlanView } from "@/lib/calc/use-plan";

interface ItemFieldProps {
  view: PlanView;
  id: string;
  /** "item" is a box of the detailed mode, "quick" a box of the quick mode. */
  kind: "item" | "quick";
}

/** The line under a box that shows what its amount is multiplied by; null when nothing is multiplied. */
function lineTotalOf(def: ItemDef, field: AmountField, result: ItemResult | undefined) {
  const unit = countUnitOf(effectiveScaling(def, field));
  if (unit === null || !result?.typed || result.cents === null) return null;
  return <LineTotal unit={unit} count={result.multiplier} cents={result.cents} />;
}

/** The item id of the "How do I find this price?" page, or undefined when the item has no page. */
function guideIdOf(id: string): string | undefined {
  return hasGuide(id) ? id : undefined;
}

/** A money box of the plan, wired to the plan store. */
export function ItemField({ view, id, kind }: ItemFieldProps) {
  const t = useTranslations("calc.items");
  const fees = useTranslations("fees");
  const def = findItem(id);
  const field = kind === "quick" ? view.plan.quick[id] : view.plan.items[id];
  if (!def || !field) return null;

  const result = view.result.items.find((item) => item.id === id);
  // An item that counts nobody (the family items of a person alone) is not shown; its typed value is kept.
  if (result?.applicable === false) return null;
  const change = kind === "quick" ? view.actions.setQuick : view.actions.setItem;

  const box = (
    <AmountInput
      label={t(id)}
      field={field}
      localCode={view.plan.localCurrency}
      onChange={(patch) => change(id, patch)}
      scaling={def.scaling}
      hasToggle={def.toggle === true}
      guideItemId={guideIdOf(id)}
      invalid={result?.invalid}
      needsRate={result?.needsRate}
      note={lineTotalOf(def, field, result)}
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
