"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Money } from "@/components/Num";
import { Section } from "@/components/ui";
import { localized } from "@/components/FieldValue";
import { carMonthlyCost, gigEarnings } from "@/lib/calculators/gig";
import type { TaxTables } from "@/lib/calculators/tax";
import { BigResult, CalcField, MissingNote, NumInput } from "./shared";
import type { MetroOption } from "./TakeHome";

export interface GigMetro extends MetroOption {
  carInsurance: number | null;
}

/**
 * ⚠️ أكبر رقم في الصفحة هو `realHourlyWage` — الأجر الحقيقي في الساعة
 * بعد البنزين والاستهلاك والضرايب. "كسبت $2,400 الشهر ده" رقم بيضحك
 * على صاحبه، وده الرقم الوحيد اللي بيغيّر قرار الناس فعلًا.
 */
export function GigCalc({
  tables,
  metros,
}: {
  tables: TaxTables;
  metros: GigMetro[];
}) {
  const t = useTranslations("gig");
  const locale = useLocale() as "ar" | "en";

  const [metroSlug, setMetroSlug] = useState(metros[0]?.slug ?? "");
  const [gross, setGross] = useState(2400);
  const [workMiles, setWorkMiles] = useState(1600);
  const [totalMiles, setTotalMiles] = useState(2000);
  const [milesPerHour, setMilesPerHour] = useState(18);
  const [carPrice, setCarPrice] = useState(8000);
  const [down, setDown] = useState(2000);
  const [apr, setApr] = useState(13.5);
  const [mpg, setMpg] = useState(28);
  const [fuel, setFuel] = useState(3.5);

  const metro = metros.find((m) => m.slug === metroSlug);

  const car = useMemo(
    () =>
      carMonthlyCost({
        price: carPrice,
        downPayment: down,
        apr: apr / 100,
        loanMonths: 48,
        monthlyMiles: totalMiles,
        mpg,
        fuelPricePerGallon: fuel,
        monthlyInsurance: metro?.carInsurance ?? null,
        annualRegistration: null,
        maintenancePerMile: null,
        rideshareInsuranceAddOn: 40,
      }),
    [carPrice, down, apr, totalMiles, mpg, fuel, metro],
  );

  const result = useMemo(
    () => gigEarnings({ grossEarnings: gross, workMiles, totalMiles, milesPerHour, car }, tables),
    [gross, workMiles, totalMiles, milesPerHour, car, tables],
  );

  return (
    <div className="space-y-6">
      <BigResult
        label={t("realHourly")}
        value={
          result.realHourlyWage !== null
            ? `$${result.realHourlyWage.toFixed(2)}`
            : "—"
        }
        hint={t("realHourlyHint")}
        missing={result.realHourlyWage === null}
      />

      <Card status="now">
        <div className="p-5 space-y-4">
          <CalcField label={t("city")}>
            <select
              value={metroSlug}
              onChange={(e) => setMetroSlug(e.target.value)}
              className="rounded-sm border border-[var(--glass-border)] bg-transparent px-3 py-1.5"
            >
              {metros.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {localized(m.name, locale)}
                </option>
              ))}
            </select>
          </CalcField>
          <CalcField label={t("gross")}>
            <NumInput value={gross} onChange={setGross} prefix="$" />
          </CalcField>
          <CalcField label={t("workMiles")}>
            <NumInput value={workMiles} onChange={setWorkMiles} />
          </CalcField>
          <CalcField label={t("totalMiles")}>
            <NumInput value={totalMiles} onChange={setTotalMiles} />
          </CalcField>
          <CalcField label={t("milesPerHour")}>
            <NumInput value={milesPerHour} onChange={setMilesPerHour} />
          </CalcField>
          <CalcField label={t("carPrice")}>
            <NumInput value={carPrice} onChange={setCarPrice} prefix="$" />
          </CalcField>
          <CalcField label={t("down")}>
            <NumInput value={down} onChange={setDown} prefix="$" />
          </CalcField>
          <CalcField label={t("apr")}>
            <NumInput value={apr} onChange={setApr} suffix="%" step={0.1} />
          </CalcField>
          <CalcField label={t("mpg")}>
            <NumInput value={mpg} onChange={setMpg} />
          </CalcField>
          <CalcField label={t("fuel")}>
            <NumInput value={fuel} onChange={setFuel} prefix="$" step={0.1} />
          </CalcField>
        </div>
      </Card>

      <Section title={t("whereItGoes")}>
        <ul className="space-y-2 text-sm">
          {[
            { k: "gross", v: result.gross, sign: "+" },
            { k: "carShare", v: -result.carShare, sign: "−" },
            { k: "selfEmploymentTax", v: -result.selfEmploymentTax, sign: "−" },
          ].map((row) => (
            <li
              key={row.k}
              className="flex items-center justify-between gap-4 py-1.5 border-b border-[var(--glass-border)]"
            >
              <span>{t(`lines.${row.k}`)}</span>
              <span>
                {row.sign}
                <Money value={Math.round(Math.abs(row.v))} />
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-4 py-2 font-bold">
            <span>{t("lines.net")}</span>
            <Money value={Math.round(result.net)} />
          </li>
        </ul>

        <p className="text-sm text-[var(--slate)]">
          {t("mileageNote", { amount: Math.round(result.mileageDeduction) })}
        </p>
      </Section>

      <MissingNote fields={result.missingFields} />
    </div>
  );
}
