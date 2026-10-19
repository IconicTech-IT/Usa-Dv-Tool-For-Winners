"use client";

import { useTranslations } from "next-intl";

import { AmountInput } from "@/components/calc/AmountInput";
import { findItem } from "@/lib/calc/catalog";
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
  const def = findItem(id);
  const field = kind === "quick" ? view.plan.quick[id] : view.plan.items[id];
  if (!def || !field) return null;

  const result = view.result.items.find((item) => item.id === id);
  const change = kind === "quick" ? view.actions.setQuick : view.actions.setItem;

  return (
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
}
