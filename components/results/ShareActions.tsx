"use client";

import { useTranslations } from "next-intl";

import { useNumberLocale } from "@/components/calc/format";
import { Icon } from "@/components/Icon";
import { PrintButton } from "@/components/print/PrintButton";
import type { NumberLocale } from "@/lib/calc/parse-amount";
import { formatNumber } from "@/lib/calc/parse-amount";
import { formatMoney } from "@/lib/calc/money";
import { scenarioTotalCents, whatsappUrl } from "@/lib/calc/summary";
import type { PlanView } from "@/lib/calc/use-plan";

type Translate = ReturnType<typeof useTranslations>;

function summaryText(view: PlanView, t: Translate, locale: NumberLocale): string {
  const { result } = view;
  const dollars = (cents: bigint) => `$ ${formatMoney(cents, locale)}`;
  const lines = [
    t("results.shareHeader"),
    `${t("results.household")}: ${t("results.householdValue", {
      adults: formatNumber(result.adults, locale, 0),
      children: formatNumber(result.children, locale, 0),
    })}`,
    `${t("results.oneOff")}: ${dollars(result.oneTimeCents)}`,
    `${t("results.monthly")}: ${dollars(result.monthlyCents)}`,
  ];
  if (result.follow !== null) {
    const months = formatNumber(result.follow.months, locale, 0);
    lines.push(
      `${t("results.travel")}: ${t("results.travelFollow", { months })}`,
      `${t("runway.arrivalTitle", { months })}: ${dollars(result.follow.cashByArrivalCents)}`,
    );
  }
  const safest = result.scenarios[result.scenarios.length - 1];
  if (safest) {
    lines.push(
      `${t("compare.scenario3")}: ${dollars(scenarioTotalCents(safest, result))}`,
      `${t("runway.stillToSave")}: ${dollars(safest.shortfallCents)}`,
    );
  }
  return lines.join("\n");
}

/** Print (or save as PDF from the browser) and share the summary on WhatsApp. */
export function ShareActions({ view }: { view: PlanView }) {
  const t = useTranslations();
  const locale = useNumberLocale();

  return (
    <div className="row2 no-print" style={{ marginTop: 18 }}>
      <PrintButton />
      <a
        className="btn wa"
        href={whatsappUrl(summaryText(view, t, locale))}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon name="whatsapp" />
        {t("results.whatsapp")}
      </a>
    </div>
  );
}
