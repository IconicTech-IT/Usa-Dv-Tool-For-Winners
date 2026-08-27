"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Money } from "@/components/Num";
import { Section } from "@/components/ui";
import { localized } from "@/components/FieldValue";
import { carMonthlyCost, gigEarnings } from "@/lib/calculators/gig";
import type { TaxTables } from "@/lib/calculators/tax";
import { BigResult, CalcField, MissingNote, NumInput, SendIncomeToPlan } from "./shared";
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

  /**
   * ⚠️ التلات حقول دول كانوا `null` ثابتين في النداء على `carMonthlyCost`.
   *
   * يعني الحاسبة كانت بتقول تحت "٣ أرقام ناقصة والنتيجة ممكن تتغير"
   * **ومفيش خانة يكتبهم فيها**. بنقوله فيه حاجة ناقصة ومنديلوش طريقة
   * يكمّلها — وده أوحش من إننا منقولش أصلًا، لأنه بيخلي الرقم الكبير
   * مشكوك فيه من غير ما يقدر يعمل حاجة.
   *
   * والتأمين بالذات بيتملّي من رقم المدينة لو عندنا — نفس السلوك في
   * حاسبة العربية بالظبط.
   */
  const [insurance, setInsurance] = useState<number | null>(null);
  const [registration, setRegistration] = useState<number | null>(null);
  const [maintPerMile, setMaintPerMile] = useState<number | null>(null);

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
        monthlyInsurance: insurance ?? metro?.carInsurance ?? null,
        annualRegistration: registration,
        maintenancePerMile: maintPerMile,
        rideshareInsuranceAddOn: 40,
      }),
    [
      carPrice,
      down,
      apr,
      totalMiles,
      mpg,
      fuel,
      metro,
      insurance,
      registration,
      maintPerMile,
    ],
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
              className="rounded-sm border border-[var(--glass-border)] bg-[var(--field-bg)] px-3 py-1.5"
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
          {/**
           * ⚠️ التلات خانات دول كانوا ناقصين تمامًا من الواجهة.
           * الحسبة كانت بتعتمد عليهم وتقول إنهم ناقصين ومفيش مكان
           * يتكتبوا فيه.
           */}
          <CalcField label={t("insuranceInput")}>
            <NumInput
              value={insurance ?? metro?.carInsurance ?? 0}
              onChange={setInsurance}
              prefix="$"
            />
          </CalcField>
          <CalcField label={t("registrationInput")}>
            <NumInput value={registration ?? 0} onChange={setRegistration} prefix="$" />
          </CalcField>
          <CalcField label={t("maintPerMile")}>
            <NumInput
              value={maintPerMile ?? 0}
              onChange={setMaintPerMile}
              prefix="$"
              step={0.01}
            />
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

      {/**
       * ⚠️ الرقم ده هو اللي الخطة محتاجاه.
       * المستخدم قعد يظبط أميال وساعات وبنزين لحد ما طلع صافي شهري
       * حقيقي — لو رجع للخطة ولقاها لسه بترسم بافتراضنا، يبقى الشغل
       * اللي عمله هنا راح على الفاضي.
       */}
      <SendIncomeToPlan monthly={result.net} />

      <MissingNote fields={result.missingFields} />
    </div>
  );
}
