"use client";

import { useTranslations } from "next-intl";

import { useNumberLocale } from "@/components/calc/format";
import { Icon } from "@/components/Icon";
import type { PlanSummary } from "@/lib/calc/compare";
import { formatMoney } from "@/lib/calc/money";
import { whatsappUrl } from "@/lib/calc/summary";

interface CompareActionsProps {
  first: PlanSummary;
  second: PlanSummary;
}

/** Print the comparison, or share how much each plan still needs on WhatsApp. */
export function CompareActions({ first, second }: CompareActionsProps) {
  const t = useTranslations();
  const locale = useNumberLocale();
  const dollars = (cents: bigint) => `$ ${formatMoney(cents, locale)}`;
  const text = [
    t("results.shareHeader"),
    `${first.name}: ${dollars(first.stillToSaveCents)}`,
    `${second.name}: ${dollars(second.stillToSaveCents)}`,
  ].join("\n");

  return (
    <div className="row2 no-print" style={{ marginTop: 18 }}>
      <button type="button" className="btn pr" onClick={() => window.print()}>
        <Icon name="print" />
        {t("results.print")}
      </button>
      <a className="btn wa" href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer">
        <Icon name="whatsapp" />
        {t("results.whatsapp")}
      </a>
    </div>
  );
}
