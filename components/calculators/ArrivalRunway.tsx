"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Money, Num } from "@/components/Num";
import { Section } from "@/components/ui";
import { localized } from "@/components/FieldValue";
import { useUser } from "@/lib/store/user-store";
import { computeRequired, computePlan } from "@/lib/planner/engine";
import type { PlannerMetro } from "@/lib/planner/metro";
import { BigResult, CalcField, MissingNote, NumInput } from "./shared";

/** حاسبة تكلفة الوصول — نفس محرك الخطة، مخرج واحد. */
export function ArrivalCalc({ metros }: { metros: PlannerMetro[] }) {
  const t = useTranslations("arrival");
  const locale = useLocale() as "ar" | "en";
  const profile = useUser((s) => s.profile);
  const setProfile = useUser((s) => s.setProfile);

  const [metro, setMetro] = useState(metros[0]?.slug ?? "");
  const adults = profile.adults ?? 1;
  const kids = profile.kidsAges?.length ?? 0;

  const result = useMemo(
    () =>
      computeRequired(
        {
          metro,
          adults,
          kidsAges: Array.from({ length: kids }, () => 8),
          monthsWithoutWork: 0,
          includeTravel: true,
          monthlyIncomeFromHome: 0,
        },
        metros,
      ),
    [metro, adults, kids, metros],
  );

  const prefilled = profile.adults !== undefined;

  return (
    <div className="space-y-6">
      <BigResult
        label={t("landingCost")}
        value={result ? `$${result.landingCost.toLocaleString("en-US")}` : "—"}
        hint={t("hint")}
        missing={!result || (result.unverifiedFields.length > 0 && result.landingCost === 0)}
      />

      <Card status="now">
        <div className="p-5 space-y-4">
          {prefilled && <p className="text-sm text-[var(--slate)]">{t("prefilled")}</p>}
          <CalcField label={t("city")}>
            <select
              value={metro}
              onChange={(e) => setMetro(e.target.value)}
              className="rounded-sm border border-[var(--glass-border)] bg-[var(--field-bg)] px-3 py-1.5"
            >
              {metros.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {localized(m.name, locale)}
                </option>
              ))}
            </select>
          </CalcField>
          <CalcField label={t("adults")}>
            <NumInput value={adults} onChange={(n) => setProfile({ adults: n })} />
          </CalcField>
          <CalcField label={t("kids")}>
            <NumInput
              value={kids}
              onChange={(n) =>
                setProfile({ kidsAges: Array.from({ length: Math.max(0, n) }, () => 8) })
              }
            />
          </CalcField>
        </div>
      </Card>

      {result && (
        <>
          <Section title={t("breakdown")}>
            <ul className="space-y-2 text-sm">
              {result.breakdown
                .filter((b) => b.key !== "months")
                .map((b) => (
                  <li
                    key={b.key}
                    className="flex items-center justify-between gap-4 py-1.5 border-b border-[var(--glass-border)]"
                  >
                    <span>{localized(b.label, locale)}</span>
                    <Money value={b.amount} />
                  </li>
                ))}
            </ul>
          </Section>
          <MissingNote fields={result.unverifiedFields} />
        </>
      )}
    </div>
  );
}

/** حاسبة الرصيد: فلوسك تقعد كام شهر. */
export function RunwayCalc({ metros }: { metros: PlannerMetro[] }) {
  const t = useTranslations("runway");
  const locale = useLocale() as "ar" | "en";
  const profile = useUser((s) => s.profile);
  const setProfile = useUser((s) => s.setProfile);

  const [metro, setMetro] = useState(metros[0]?.slug ?? "");
  const money = profile.money ?? 3000;
  const income = profile.monthlyIncomeFromHome ?? 0;

  const plan = useMemo(() => {
    const chosen = metros.filter((m) => m.slug === metro);
    return computePlan(
      {
        money,
        moneyIncludesTravel: profile.moneyIncludesTravel ?? false,
        monthlyIncomeFromHome: income,
        monthlyDebt: profile.monthlyDebt ?? 0,
        travellingAlone: profile.travellingAlone ?? true,
        adults: profile.adults ?? 1,
        kidsAges: profile.kidsAges ?? [],
        spouseWillWork: false,
        hostCity: null,
        hostNights: 0,
        englishLevel: 1,
        drivingYears: 0,
        profession: "",
        openToPhysicalWork: true,
        priorities: ["fastIncome", "lowCost", "community", "schools", "career"],
      },
      chosen.length ? chosen : metros,
    );
  }, [money, income, metro, metros, profile]);

  return (
    <div className="space-y-6">
      <BigResult
        label={t("lasts")}
        value={plan.runwayMonths >= 99 ? "12+" : plan.runwayMonths.toFixed(1)}
        hint={t("months")}
        missing={false}
      />

      <Card status="now">
        <div className="p-5 space-y-4">
          <CalcField label={t("money")}>
            <NumInput value={money} onChange={(n) => setProfile({ money: n })} prefix="$" />
          </CalcField>
          <CalcField label={t("income")}>
            <NumInput
              value={income}
              onChange={(n) => setProfile({ monthlyIncomeFromHome: n })}
              prefix="$"
            />
          </CalcField>
          <CalcField label={t("city")}>
            <select
              value={metro}
              onChange={(e) => setMetro(e.target.value)}
              className="rounded-sm border border-[var(--glass-border)] bg-[var(--field-bg)] px-3 py-1.5"
            >
              {metros.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {localized(m.name, locale)}
                </option>
              ))}
            </select>
          </CalcField>
        </div>
      </Card>

      <Section title={t("monthByMonth")}>
        <ul className="space-y-1.5 text-sm">
          {plan.monthlyProjection.map((p) => (
            <li
              key={p.month}
              className="flex items-center justify-between gap-4 py-1 border-b border-[var(--glass-border)]"
            >
              <span>
                {t("month")} <Num>{p.month}</Num>
              </span>
              <span className={p.expected < 0 ? "text-[var(--alert)]" : ""}>
                <Money value={p.expected} />
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <MissingNote fields={plan.unverifiedFields.slice(0, 10)} />
    </div>
  );
}
