"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Money, Num } from "@/components/Num";
import { Section } from "@/components/ui";
import { localized } from "@/components/FieldValue";
import { USED_CAR_PRICE } from "@/lib/planner/engine";
import { breakEvenMonths, carMonthlyCost } from "@/lib/calculators/gig";
import { useUser } from "@/lib/store/user-store";
import { Link } from "@/i18n/navigation";
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

  /**
   * ⚠️ المدينة بتتملّي من خطة المستخدم لو عنده واحدة.
   * قاعدة في PROJECT-RULES: المستخدم مايكتبش نفس المعلومة مرتين. جاي من
   * الخطة عشان يحسب تأمين مدينته — فمالوش لازمة يدوّر عليها في القايمة.
   */
  const plan = useUser((st) => st.plan);
  const setOverride = useUser((st) => st.setOverride);

  /**
   * ⚠️ المدينة **مشتقة مش مجمّدة**.
   *
   * zustand بيرجّع الداتا من localStorage **بعد** أول render. فلو جمّدنا
   * المدينة في `useState` الأولاني، هتتحسب والخطة لسه `null` وتقع على أول
   * مدينة في القايمة — واللي جاي من خطته في هيوستن يلاقي نفسه بيحسب
   * لأرلينجتون، وأسوأ: لما يبعت الرقم للخطة يروح للمدينة الغلط.
   *
   * فبنمسك "اختار بإيده؟" بس، والباقي بيتحسب من الstore كل render.
   */
  const [picked, setPicked] = useState<string | null>(null);
  const planMetro =
    plan?.chosenMetro && metros.some((m) => m.slug === plan.chosenMetro)
      ? plan.chosenMetro
      : null;
  const metroSlug = picked ?? planMetro ?? metros[0]?.slug ?? "";
  const setMetroSlug = setPicked;
  const fromPlan = picked === null && planMetro !== null;
  const [sentToPlan, setSentToPlan] = useState(false);
  // الرقم الافتراضي من content/arrival-costs.json مش مكتوب هنا
  const [price, setPrice] = useState(USED_CAR_PRICE);
  const [down, setDown] = useState(2000);
  const [apr, setApr] = useState(13.5);
  const [months, setMonths] = useState(48);
  const [miles, setMiles] = useState(1000);
  const [mpg, setMpg] = useState(28);
  const [fuel, setFuel] = useState(3.5);
  const [rentAlternative, setRentAlternative] = useState(950);

  /**
   * ⚠️ التلات حقول دول كانوا `null` ثابتين في الحسبة.
   *
   * يعني الحاسبة كانت بتقول للمستخدم "٣ أرقام ناقصة والنتيجة ممكن تتغير"
   * **ومفيش خانة يكتبهم فيها**. بنقوله فيه حاجة ناقصة ومنديلوش طريقة
   * يكمّلها — وده أسوأ من إننا منقولش أصلًا.
   *
   * التأمين بيتملّي من رقم المدينة لو عندنا، والباقي المستخدم بيجيبه من
   * عرض السعر أو من موقع المرور — دي أرقام هو يقدر يوصلها وإحنا لأ.
   */
  const [insurance, setInsurance] = useState<number | null>(null);
  const [registration, setRegistration] = useState<number | null>(null);
  const [maintPerMile, setMaintPerMile] = useState<number | null>(null);

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
        monthlyInsurance: insurance ?? metro?.carInsurance ?? null,
        annualRegistration: registration,
        maintenancePerMile: maintPerMile,
        rideshareInsuranceAddOn: 0,
      }),
    [price, down, apr, months, miles, mpg, fuel, metro, insurance, registration, maintPerMile],
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
          {fromPlan && (
            <p className="text-sm text-[var(--slate)]">{t("fromPlan")}</p>
          )}
          {/**
           * ⚠️ لو المدينة اتملّت من خطته، لازم يعرف.
           * قاعدة في PROJECT-RULES: الأداة بتملّي حقولها من الstore
           * **وتقول للمستخدم "ملّينالك ده من بياناتك"** — مش تملا في السر
           * وتسيبه يفتكر إنه هو اللي اختار.
           */}
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
          {/**
           * ⚠️ التلات خانات دول كانوا ناقصين تمامًا.
           *
           * الحسبة كانت بتقول "٣ أرقام ناقصة والنتيجة ممكن تتغير" ومفيش
           * مكان يكتبهم فيه. بنقوله فيه حاجة ناقصة ومنديلوش طريقة يكمّلها.
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

      {/**
       * ⚠️ الرجوع للخطة بالرقم، مش بالإيدين.
       *
       * من غير الكارت ده المستخدم يحسب هنا، يفتكر الرقم، يرجع للخطة،
       * ويكتبه تاني — وأول ما يغلط في نقله تبقى خطته مبنية على رقم تاني
       * خالص. الزرار بيكتب الرقم في نفس المكان اللي المحرر بيكتب فيه،
       * فالخطة بتلاقيه مستنيها.
       */}
      {insurance !== null && insurance > 0 && (
        <Card status="done">
          <div className="space-y-2 p-4 text-sm">
            <p className="font-bold">{t("useInPlan.title")}</p>
            <p className="text-[var(--slate)]">{t("useInPlan.lead")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setOverride(metroSlug, "carInsurance", {
                    mode: "custom",
                    value: insurance,
                  });
                  setSentToPlan(true);
                }}
                className="rounded-sm border border-[var(--glass-border)] px-3 py-1.5"
              >
                {t("useInPlan.send")}
              </button>
              {sentToPlan && (
                <Link href="/planner" className="underline underline-offset-4">
                  {t("useInPlan.backToPlan")}
                </Link>
              )}
            </div>
            {sentToPlan && (
              <p className="text-[var(--seal)]">{t("useInPlan.done")}</p>
            )}
          </div>
        </Card>
      )}

      <MissingNote fields={cost.missingFields} />
    </div>
  );
}
