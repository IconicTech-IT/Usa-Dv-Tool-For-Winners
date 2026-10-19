"use client";

import { useTranslations } from "next-intl";

import { UsdAmount } from "@/components/calc/DualAmount";
import { useNumberLocale } from "@/components/calc/format";
import type { CountUnit } from "@/lib/calc/catalog";
import type { Cents } from "@/lib/calc/money";
import { formatNumber } from "@/lib/calc/parse-amount";

interface LineTotalProps {
  unit: CountUnit;
  /** What the typed amount is multiplied by. */
  count: number;
  /** The amount after the multiplier, in US cents. */
  cents: Cents;
}

/** "× 3 people = $ …": shows a user what an amount that scales with the household counts. */
export function LineTotal({ unit, count, cents }: LineTotalProps) {
  const t = useTranslations("calc.multiplier");
  const locale = useNumberLocale();
  return (
    <div className="help line-total">
      {t(unit, { count, shown: formatNumber(count, locale, 0) })} = <UsdAmount cents={cents} />
    </div>
  );
}
