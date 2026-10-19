"use client";

import { useTranslations } from "next-intl";

import { AmountInput } from "@/components/calc/AmountInput";
import { useIncludes } from "@/components/calc/use-includes";
import { hasGuide } from "@/lib/guide/links";
import type { PlanView } from "@/lib/calc/use-plan";

/**
 * A monthly box of the months the principal spends alone, when the family follows later: what one
 * person costs a month. It has no "per person" switch and no multiplier, because nobody else is there.
 */
export function AloneField({ view, id }: { view: PlanView; id: string }) {
  const t = useTranslations("calc.items");
  const includes = useIncludes(id);
  const field = view.plan.aloneMonthly[id];
  const result = view.result.aloneItems.find((item) => item.id === id);
  if (!field || result?.applicable === false) return null;

  return (
    <AmountInput
      label={t(id)}
      field={field}
      localCode={view.plan.localCurrency}
      onChange={(patch) => view.actions.setAloneMonthly(id, patch)}
      guideItemId={hasGuide(id) ? id : undefined}
      invalid={result?.invalid}
      needsRate={result?.needsRate}
      includes={includes}
    />
  );
}
