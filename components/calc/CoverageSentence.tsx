"use client";

import { useTranslations } from "next-intl";

import { useNumberLocale } from "@/components/calc/format";
import { formatMoney } from "@/lib/calc/money";
import { formatNumber } from "@/lib/calc/parse-amount";
import type { PlanView } from "@/lib/calc/use-plan";

/** One plain sentence about the savings: how many months they last, or how much is still to save. */
export function CoverageSentence({ view }: { view: PlanView }) {
  const t = useTranslations("runway");
  const locale = useNumberLocale();
  const { coverage } = view.result;
  if (coverage === null) return null;

  let text: string;
  if (coverage.kind === "short") {
    text = t("coverShort", { amount: `$ ${formatMoney(coverage.shortCents, locale)}` });
  } else if (coverage.months === 0) {
    text = t("coverUnderMonth");
  } else {
    text = t("coverMonths", { count: coverage.months, shown: formatNumber(coverage.months, locale, 0) });
  }
  return <p className="cover">{text}</p>;
}
