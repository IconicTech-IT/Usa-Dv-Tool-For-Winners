"use client";

import { useTranslations } from "next-intl";

import { AloneField } from "@/components/calc/AloneField";
import { DualAmount } from "@/components/calc/DualAmount";
import { ItemField } from "@/components/calc/ItemField";
import { ALONE_MONTHLY_ITEMS, itemsOfCalculator } from "@/lib/calc/catalog";
import type { PlanView } from "@/lib/calc/use-plan";

/** The family's costs back home are typed with the months alone, not with the family's months. */
const FAMILY_ABROAD = "familyAbroadMonthly";
const FAMILY_ITEMS = itemsOfCalculator("monthly").filter((item) => item.id !== FAMILY_ABROAD);

/**
 * The monthly boxes. One card normally; when the family follows later, two: the months the principal
 * is alone (one person's costs, typed for one) and the months with the whole family (typed for all).
 */
export function MonthlyCards({ view }: { view: PlanView }) {
  const t = useTranslations("runway");
  const stages = useTranslations("calc.stages");
  const { plan, result } = view;
  const { follow } = result;

  const family = (
    <section className="card" style={{ marginTop: follow === null ? 14 : 12 }}>
      <h2 className="card-title">
        {follow === null ? (
          <>
            {t("monthlyHeading")} · <b className="when">{stages("monthly")}</b>
          </>
        ) : (
          t("familyHeading")
        )}
      </h2>
      {follow === null ? null : <p className="muted">{t("familyHint")}</p>}
      {FAMILY_ITEMS.map((item) => (
        <ItemField key={item.id} view={view} id={item.id} kind="item" />
      ))}
      <div className="subtot">
        <span>{follow === null ? t("monthlyTotal") : t("monthlyFamily")}</span>
        <DualAmount cents={result.monthlyCents} result={result} localCode={plan.localCurrency} />
      </div>
    </section>
  );
  if (follow === null) return family;

  return (
    <>
      <section className="card" style={{ marginTop: 14 }}>
        <h2 className="card-title">{t("aloneHeading")}</h2>
        <p className="muted">{t("aloneHint")}</p>
        {ALONE_MONTHLY_ITEMS.map((item) => (
          <AloneField key={item.id} view={view} id={item.id} />
        ))}
        <ItemField view={view} id={FAMILY_ABROAD} kind="item" />
        <div className="subtot">
          <span>{t("monthlyAlone")}</span>
          <DualAmount cents={follow.aloneMonthlyCents} result={result} localCode={plan.localCurrency} />
        </div>
      </section>
      {family}
    </>
  );
}
