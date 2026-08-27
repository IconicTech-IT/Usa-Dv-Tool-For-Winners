"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Money } from "@/components/Num";
import { Section } from "@/components/ui";
import { localized } from "@/components/FieldValue";
import { useUser } from "@/lib/store/user-store";
import { computeRequired, computePlan } from "@/lib/planner/engine";
import type { PlannerMetro } from "@/lib/planner/metro";
import { BalanceChart } from "@/components/BalanceChart";
import { CostEditor } from "@/components/planner/CostEditor";
import { BigResult, CalcField, MissingNote, NumInput } from "./shared";

/** حاسبة تكلفة الوصول — نفس محرك الخطة، مخرج واحد. */
export function ArrivalCalc({ metros }: { metros: PlannerMetro[] }) {
  const t = useTranslations("arrival");
  const locale = useLocale() as "ar" | "en";
  const profile = useUser((s) => s.profile);
  const setProfile = useUser((s) => s.setProfile);

  const [metro, setMetro] = useState(metros[0]?.slug ?? "");
  const adults = profile.adults ?? 1;
  /**
   * ⚠️ الأعمار الحقيقية من الstore، مش `8` لكل طفل.
   * تمن تذكرة الطيران بيتغير بالسن: أقل من سنتين بيسافر في الحضن،
   * و١٢ فما فوق بيدفع تذكرة بالغ. تجاهل السن كان بيغلط في الاتجاهين.
   */
  const kidsAges = useMemo(() => profile.kidsAges ?? [], [profile.kidsAges]);
  const kids = kidsAges.length;

  const result = useMemo(
    () =>
      computeRequired(
        {
          metro,
          adults,
          kidsAges,
          monthsWithoutWork: 0,
          includeTravel: true,
          monthlyIncomeFromHome: 0,
        },
        metros,
      ),
    [metro, adults, kidsAges, metros],
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
                setProfile({
                  kidsAges: Array.from(
                    { length: Math.max(0, n) },
                    (_, i) => kidsAges[i] ?? 8,
                  ),
                })
              }
            />
          </CalcField>
          {/* السن بيغيّر تمن التذكرة — فبيتسأل هنا زي ما بيتسأل في الخطة */}
          {kids > 0 && (
            <div className="space-y-2">
              <span className="text-sm">{t("kidAges")}</span>
              <div className="flex flex-wrap gap-2">
                {kidsAges.map((age, i) => (
                  <label key={i} className="flex items-center gap-1.5 text-sm">
                    <span className="text-[var(--slate)]">{t("kidNumber", { n: i + 1 })}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={25}
                      dir="ltr"
                      value={age}
                      onChange={(e) =>
                        setProfile({
                          kidsAges: kidsAges.map((a, j) =>
                            j === i ? Math.max(0, Number(e.target.value)) : a,
                          ),
                        })
                      }
                      className="num w-16 rounded-sm border border-[var(--glass-border)] bg-[var(--field-bg)] px-2 py-1.5"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
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
  /**
   * ⚠️ أرقام المستخدم لازم تدخل الحسبة هنا كمان.
   * من غير كده، اللي صحّح إيجاره في الخطة يرجع للحاسبة دي يلاقيها
   * بتحسبله بمتوسطنا — نفس السؤال بإجابتين مختلفتين في نفس الموقع.
   */
  const overrides = useUser((s) => s.overrides);

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
        // ⚠️ من غير السطر ده الرسمة هنا هتفضل ترسم بافتراضنا حتى بعد
        // ما المستخدم يحسب دخله في حاسبة التطبيقات ويبعته لخطته.
        expectedMonthlyIncome: profile.expectedMonthlyIncome ?? null,
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
      overrides,
    );
  }, [money, income, metro, metros, profile, overrides]);

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

      {/**
       * ⚠️ ده كان قايمة ١٢ سطر فيها رقم واحد لكل شهر — ومن غير ما تقول
       * إن الرقم ده مفترض فيه دخل. نفس رسمة الخطة بالظبط دلوقتي، ومن
       * نفس الcomponent، فمستحيل الاتنين يفترقوا.
       */}
      <BalanceChart
        data={plan.monthlyProjection}
        assumption={plan.incomeAssumption}
        incomeToolHref="/calculators/gig"
      />

      {/**
       * ⚠️ كانت بتقول "٣ أرقام ناقصة" وخلاص.
       *
       * الحاسبة كانت بتعلن النقص ومتديش أي طريقة تسده — والمحرر ده
       * موجود في الخطة من زمان وبيكتب في نفس المكان بالظبط. فاللي
       * يصحّح إيجاره هنا بيلاقيه متصحّح في خطته، والعكس.
       */}
      <CostEditor
        metroSlug={plan.chosenMetro}
        metroName={(() => {
          const m = metros.find((x) => x.slug === plan.chosenMetro);
          return m ? localized(m.name, locale) : undefined;
        })()}
        landing={plan.landingBreakdown}
        burn={plan.burnBreakdown}
        highlight={plan.unverifiedFields.map((f) => f.split(".").pop() ?? f)}
      />

      <MissingNote fields={plan.unverifiedFields.slice(0, 10)} />
    </div>
  );
}
