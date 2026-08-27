"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Money, Num } from "@/components/Num";
import { Section } from "@/components/ui";
import { localized } from "@/components/FieldValue";
import { USED_CAR_PRICE } from "@/lib/planner/engine";
import { breakEvenMonths, carMonthlyCost } from "@/lib/calculators/gig";
import { BigResult, CalcField, MissingNote, NumInput } from "./shared";
import type { GigMetro } from "./GigCalc";

/**
 * التكلفة الحقيقية للعربية، مقارنة بإيجارها من التطبيق.
 *
 * ⚠️ الـAPR بيتحدد بحالة الائتمان، والمهاجر الجديد بياخد نسبة عالية جدًا
 * لأن مفيش عنده تاريخ. الرقم ده بيتعرض بصراحة من غير تلطيف — الناس
 * لازم تشوفه **قبل** ما تدخل معرض عربيات مش بعديها.
 */
export function CarCalc({ metros }: { metros: (GigMetro & { carNeed: number | null })[] }) {
  const t = useTranslations("car");
  const locale = useLocale() as "ar" | "en";

  const [metroSlug, setMetroSlug] = useState(metros[0]?.slug ?? "");
  // الرقم الافتراضي من content/arrival-costs.json مش مكتوب هنا
  const [price, setPrice] = useState(USED_CAR_PRICE);
  const [down, setDown] = useState(2000);
  const [apr, setApr] = useState(13.5);
  const [months, setMonths] = useState(48);
  const [miles, setMiles] = useState(1000);
  const [mpg, setMpg] = useState(28);
  const [fuel, setFuel] = useState(3.5);
  const [rentAlternative, setRentAlternative] = useState(950);

  const metro = metros.find((m) => m.slug === metroSlug);

  const cost = useMemo(
    () =>
      carMonthlyCost({
        price,
        downPayment: down,
        apr: apr / 100,
        loanMonths: months,
        monthlyMiles: miles,
        mpg,
        fuelPricePerGallon: fuel,
        monthlyInsurance: metro?.carInsurance ?? null,
        annualRegistration: null,
        maintenancePerMile: null,
        rideshareInsuranceAddOn: 0,
      }),
    [price, down, apr, months, miles, mpg, fuel, metro],
  );

  const breakEven = breakEvenMonths(cost.total, rentAlternative, down);
  const canDelay = metro?.carNeed !== null && metro?.carNeed !== undefined && metro.carNeed <= 2;

  return (
    <div className="space-y-6">
      {canDelay && (
        <Card status="done">
          <div className="p-4">
            <p className="font-bold">{t("canDelay")}</p>
            <p className="text-sm">{t("canDelayHint")}</p>
          </div>
        </Card>
      )}

      <BigResult
        label={t("trueMonthly")}
        value={`$${Math.round(cost.total).toLocaleString("en-US")}`}
        hint={t("perMonth")}
        missing={cost.missingFields.length > 2}
      />

      <Card status="danger">
        <div className="p-4 text-sm">
          <p className="font-bold">{t("aprWarningTitle")}</p>
          <p>{t("aprWarning")}</p>
        </div>
      </Card>

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
          <CalcField label={t("price")}><NumInput value={price} onChange={setPrice} prefix="$" /></CalcField>
          <CalcField label={t("down")}><NumInput value={down} onChange={setDown} prefix="$" /></CalcField>
          <CalcField label={t("apr")}><NumInput value={apr} onChange={setApr} suffix="%" step={0.1} /></CalcField>
          <CalcField label={t("months")}><NumInput value={months} onChange={setMonths} /></CalcField>
          <CalcField label={t("miles")}><NumInput value={miles} onChange={setMiles} /></CalcField>
          <CalcField label={t("mpg")}><NumInput value={mpg} onChange={setMpg} /></CalcField>
          <CalcField label={t("fuel")}><NumInput value={fuel} onChange={setFuel} prefix="$" step={0.1} /></CalcField>
          <CalcField label={t("rentAlternative")}>
            <NumInput value={rentAlternative} onChange={setRentAlternative} prefix="$" />
          </CalcField>
        </div>
      </Card>

      <Section title={t("breakdown")}>
        <ul className="space-y-2 text-sm">
          {([
            ["loanPayment", cost.loanPayment],
            ["insurance", cost.insurance],
            ["fuel", cost.fuel],
            ["maintenance", cost.maintenance],
            ["registration", cost.registration],
          ] as const).map(([key, amount]) => (
            <li
              key={key}
              className="flex items-center justify-between gap-4 py-1.5 border-b border-[var(--glass-border)]"
            >
              <span>{t(`lines.${key}`)}</span>
              <Money value={Math.round(amount)} />
            </li>
          ))}
        </ul>
      </Section>

      <Card status={breakEven === null ? "danger" : "now"}>
        <div className="p-4 space-y-1 text-sm">
          <p className="font-bold">{t("vsRenting")}</p>
          {breakEven === null ? (
            <p>{t("neverBreakEven")}</p>
          ) : (
            <p>
              {t("breakEvenAfter")} <Num>{Math.ceil(breakEven)}</Num> {t("monthsWord")}
            </p>
          )}
        </div>
      </Card>

      <MissingNote fields={cost.missingFields} />
    </div>
  );
}
