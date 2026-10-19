"use client";

import { useTranslations } from "next-intl";

import { AmountInput } from "@/components/calc/AmountInput";
import { isInvalidAmountText } from "@/lib/calc/parse-amount";
import type { TopField as TopFieldKey } from "@/lib/calc/plan-actions";
import type { PlanView } from "@/lib/calc/use-plan";

interface TopFieldProps {
  view: PlanView;
  field: TopFieldKey;
}

/** Income, spouse income or savings: money boxes every plan has, outside the cost lists. */
export function TopField({ view, field }: TopFieldProps) {
  const t = useTranslations("runway");
  const value = view.plan[field];
  const invalid = isInvalidAmountText(value.raw);
  const needsRate =
    !invalid && value.raw.trim() !== "" && value.currency === "local" && view.result.rate === null;

  return (
    <AmountInput
      label={t(field)}
      field={value}
      localCode={view.plan.localCurrency}
      onChange={(patch) => view.actions.setTopField(field, patch)}
      invalid={invalid}
      needsRate={needsRate}
    />
  );
}
