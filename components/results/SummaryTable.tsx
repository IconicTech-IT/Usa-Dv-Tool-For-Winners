"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { DualAmount } from "@/components/calc/DualAmount";
import { useNumberLocale } from "@/components/calc/format";
import { Link } from "@/i18n/navigation";
import type { Calculator } from "@/lib/calc/catalog";
import { formatNumber } from "@/lib/calc/parse-amount";
import { pathForCalculator } from "@/lib/calc/routes";
import { subtotalOfCalculator } from "@/lib/calc/summary";
import type { PlanView } from "@/lib/calc/use-plan";

interface RowProps {
  label: string;
  editHref?: string | undefined;
  children: ReactNode;
}

function Row({ label, editHref, children }: RowProps) {
  const t = useTranslations("common");
  return (
    <tr>
      <td>
        {label}{" "}
        {editHref === undefined ? null : (
          <Link className="edit" href={editHref}>
            {t("edit")}
          </Link>
        )}
      </td>
      <td>{children}</td>
    </tr>
  );
}

/** The one-page summary: the household and the total of each calculator. */
export function SummaryTable({ view }: { view: PlanView }) {
  const t = useTranslations();
  const locale = useNumberLocale();
  const { plan, result } = view;
  const mode = plan.uiMode;
  const localCode = plan.localCurrency;

  const amount = (calculator: Calculator) => {
    const subtotal = subtotalOfCalculator(result, calculator);
    return (
      <DualAmount cents={subtotal.hasTyped ? subtotal.cents : null} result={result} localCode={localCode} />
    );
  };
  const savingsCents = plan.savings.raw.trim() === "" ? null : result.savingsCents;

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <table>
        <tbody>
          <Row label={t("results.household")}>
            <span className="num">
              {t("results.householdValue", {
                adults: formatNumber(result.adults, locale, 0),
                children: formatNumber(result.children, locale, 0),
              })}
            </span>
          </Row>
          <Row label={t("results.travel")} editHref="/setup">
            {result.follow === null
              ? t("results.travelTogether")
              : t("results.travelFollow", { months: formatNumber(result.follow.months, locale, 0) })}
          </Row>
          <Row label={t("fees.title")} editHref={pathForCalculator("fees", mode)}>
            {amount("fees")}
          </Row>
          <Row label={t("moving.title")} editHref={pathForCalculator("moving", mode)}>
            {amount("moving")}
          </Row>
          <Row label={t("results.monthly")} editHref={pathForCalculator("monthly", mode)}>
            {amount("monthly")}
          </Row>
          <Row label={t("results.savings")} editHref={pathForCalculator("monthly", mode)}>
            <DualAmount cents={savingsCents} result={result} localCode={localCode} />
          </Row>
          <tr className="sum">
            <td>{t("results.oneOff")}</td>
            <td>
              <DualAmount cents={result.oneTimeCents} result={result} localCode={localCode} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
