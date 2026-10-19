"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { UsdAmount } from "@/components/calc/DualAmount";
import { NO_AMOUNT, useNumberLocale } from "@/components/calc/format";
import type { PlanSummary } from "@/lib/calc/compare";
import type { Cents } from "@/lib/calc/money";
import { formatNumber } from "@/lib/calc/parse-amount";

interface CompareTableProps {
  first: PlanSummary | null;
  second: PlanSummary | null;
}

interface CompareRow {
  label: string;
  /** The cell of one opened plan. */
  cell: (plan: PlanSummary) => ReactNode;
  highlight?: boolean;
}

function dollars(pick: (plan: PlanSummary) => Cents) {
  return (plan: PlanSummary) => <UsdAmount cents={pick(plan)} />;
}

/** The two plans side by side, in US dollars (each plan keeps its own exchange rate). */
export function CompareTable({ first, second }: CompareTableProps) {
  const t = useTranslations("compare");
  const locale = useNumberLocale();
  const rate = useTranslations("rate");

  const rows: CompareRow[] = [
    {
      label: t("household"),
      cell: (plan) => (
        <span className="num">
          {formatNumber(plan.adults, locale, 0)} + {formatNumber(plan.children, locale, 0)}
        </span>
      ),
    },
    {
      label: t("travel"),
      cell: (plan) =>
        plan.followMonths === null
          ? t("together")
          : t("followAfter", { months: formatNumber(plan.followMonths, locale, 0) }),
    },
    { label: t("oneOff"), cell: dollars((plan) => plan.oneTimeCents) },
    { label: t("monthly"), cell: dollars((plan) => plan.monthlyCents) },
    { label: t("scenario3"), cell: dollars((plan) => plan.safestTotalCents) },
    { label: t("savings"), cell: dollars((plan) => plan.savingsCents) },
    { label: t("needed"), cell: dollars((plan) => plan.stillToSaveCents), highlight: true },
  ];
  const show = (plan: PlanSummary | null, row: CompareRow) => (plan === null ? NO_AMOUNT : row.cell(plan));

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <table className="cmp">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">{t("rowHeader")}</span>
            </th>
            <th className="n">{first?.name ?? t("planA")}</th>
            <th className="n">{second?.name ?? t("planB")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={row.highlight ? "hi" : undefined}>
              <td>{row.label}</td>
              <td className="n num">{show(first, row)}</td>
              <td className="n num">{show(second, row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {first?.incomplete || second?.incomplete ? <div className="fxnote">{rate("empty")}</div> : null}
    </div>
  );
}
