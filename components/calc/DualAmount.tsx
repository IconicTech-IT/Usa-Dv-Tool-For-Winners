"use client";

import { NO_AMOUNT, useNumberLocale } from "@/components/calc/format";
import { localCents, type PlanResult } from "@/lib/calc/compute";
import { formatMoney, type Cents } from "@/lib/calc/money";

interface DualAmountProps {
  /** US cents, or null when there is nothing to show yet. */
  cents: Cents | null;
  result: PlanResult;
  localCode: string;
}

/** One amount in dollars with the same amount in the user's currency under it (only with his rate). */
export function DualAmount({ cents, result, localCode }: DualAmountProps) {
  const locale = useNumberLocale();
  const local = cents === null ? null : localCents(cents, result);
  return (
    <span className="dual">
      <b className="num">$ {cents === null ? NO_AMOUNT : formatMoney(cents, locale)}</b>
      <small className="num">
        {localCode} {local === null ? NO_AMOUNT : formatMoney(local, locale)}
      </small>
    </span>
  );
}

/** The dollar amount alone, for small lines where the other currency would be noise. */
export function UsdAmount({ cents }: { cents: Cents }) {
  const locale = useNumberLocale();
  return <span className="num">$ {formatMoney(cents, locale)}</span>;
}
