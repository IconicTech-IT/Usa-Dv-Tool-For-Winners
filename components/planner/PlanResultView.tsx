"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Num, Money } from "@/components/Num";
import { CountUp } from "@/components/CountUp";
import { Section, Bullets } from "@/components/ui";
import { localized } from "@/components/FieldValue";
import { humanField } from "@/lib/content/labels";
import type { PlanResult } from "@/lib/types";
import { USED_CAR_PRICE, USED_CAR_PRICE_FIELD } from "@/lib/planner/engine";
import { BalanceChart } from "@/components/BalanceChart";
import { CostEditor } from "./CostEditor";

/**
 * مخرجات الخطة.
 *
 * ⚠️ الرسم البياني بيوقف عند خط الصفر ويقول "هنا فلوسك بتخلص" —
 * ده أهم مشهد في الموقع. والحقول اللي لسه محتاجة تأكيد بتتقال صراحة
 * تحت، مش بتتخبى.
 */
export function PlanResultView({
  plan,
  metroName,
}: {
  plan: PlanResult;
  metroName?: string;
}) {
  const t = useTranslations("planner.result");
  const tb = useTranslations("badges");
  const locale = useLocale() as "ar" | "en";

  /**
   * ⚠️ من غير أرقام السكن والأكل، الحسبة بتطلع متفائلة بشكل كاذب
   * (مصاريف $150 في الشهر → "فلوسك تكفي ٣٠ شهر"). ساعتها الصفحة
   * **بترفض تعرض رقم** وتقول اللي ناقص بالظبط.
   */
  if (!plan.computable) {
    return (
      <div className="space-y-6">
        <Card status="danger">
          <div className="p-6 space-y-2">
            <h2 className="text-xl font-bold">{t("cannotCompute")}</h2>
            <p>{t("cannotComputeWhy")}</p>
            <p className="text-sm text-[var(--slate)]">{t("cannotComputeHint")}</p>
          </div>
        </Card>

        {/* ⚠️ الكارت فوق مش نهاية الطريق: المستخدم يكتب رقمه ويكمل */}
        <CostEditor
          metroSlug={plan.chosenMetro}
          metroName={metroName}
          landing={plan.landingBreakdown}
          burn={plan.burnBreakdown}
          highlight={plan.missingEssential}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* كارت الحُكم */}
      <Card status={plan.tier === "A" ? "danger" : plan.tier === "D" ? "done" : "now"}>
        <div className="p-6 space-y-3">
          <div className="text-sm text-[var(--slate)]">{t("verdict")}</div>
          <h2 className="text-2xl font-bold">
            {plan.goAlone ? t("goAlone") : t("goTogether")}
          </h2>
          <div className="text-4xl font-bold">
            <CountUp value={plan.runwayMonths >= 99 ? 12 : plan.runwayMonths} decimals={1} />{" "}
            <span className="text-lg font-normal">{t("months")}</span>
          </div>
          <Bullets items={plan.reasons.map((r) => localized(r, locale))} />
          {/**
           * ⚠️ كان مكتوب "الشريحة D".
           *
           * الحرف ده اسم داخلي في `tiers.ts` — المستخدم بيقراه ومبيقولّهوش
           * حاجة: مش عارف D أحسن ولا أوحش من A، ولا على أي أساس اتحطّت.
           * بقى اسم يوصف وضعه، وتحته سطر بيقول معناه بالأرقام.
           */}
          <p className="text-sm text-[var(--slate)]">
            <strong>{t(`tierName.${plan.tier}`)}</strong> · {t("monthlyBurn")}{" "}
            <Money value={Math.round(plan.monthlyBurn)} /> · {t("landingCost")}{" "}
            <Money value={Math.round(plan.landingCost)} />
          </p>
          <p className="text-sm text-[var(--slate)]">
            {t(`tierMeaning.${plan.tier}`)}
          </p>
        </div>
      </Card>

      {/* المدن المرشحة */}
      <Section title={t("recommended")}>
        {plan.recommendedMetros.length === 0 && (
          <Card status="now">
            <p className="p-4 text-sm">{t("noRankableCities")}</p>
          </Card>
        )}
        <ul className="space-y-3">
          {plan.recommendedMetros.map((m, i) => (
            <Card key={m.slug} as="li" status={i === 0 ? "done" : "later"}>
              <div className="p-4 space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-bold">{localized(m.name, locale)}</h3>
                  <span className="text-sm text-[var(--slate)]">
                    {t("lastsHere")} <Num>{m.runwayMonths >= 99 ? "12+" : m.runwayMonths.toFixed(1)}</Num>{" "}
                    {t("months")}
                  </span>
                </div>
                <Bullets items={m.why.slice(0, 3).map((w) => localized(w, locale))} />
              </div>
            </Card>
          ))}
        </ul>
      </Section>

      {/* مدن تتجنبها */}
      {plan.avoidMetros.length > 0 && (
        <Section title={t("avoid")}>
          <ul className="space-y-2">
            {plan.avoidMetros.map((m) => (
              <Card key={m.slug} as="li" dense status="danger">
                <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <span>{localized(m.name, locale)}</span>
                  <span className="text-sm text-[var(--slate)]">
                    {t("onlyLasts")}{" "}
                    <Num>{m.runwayMonths >= 99 ? "12+" : m.runwayMonths.toFixed(1)}</Num>{" "}
                    {t("months")}
                  </span>
                </div>
              </Card>
            ))}
          </ul>
        </Section>
      )}

      <CostEditor
        metroSlug={plan.chosenMetro}
        metroName={metroName}
        landing={plan.landingBreakdown}
        burn={plan.burnBreakdown}
      />

      {/**
       * ⚠️ نفس الرسمة بالظبط في حاسبة الرصيد.
       * كانت متكتبة مرتين — واحدة هنا وقايمة سطور فاضية في الحاسبة —
       * فأي تحسين كان بيوصل لواحدة بس، والاتنين بيتفرجوا على نفس الداتا.
       */}
      <BalanceChart
        data={plan.monthlyProjection}
        assumption={plan.incomeAssumption}
        incomeToolHref="/calculators/gig"
      />

      {/* خطة أسبوع بأسبوع */}
      <Section title={t("weekByWeek")}>
        <ul className="space-y-2">
          {plan.weeklyActions.map((w, i) => (
            <Card key={i} as="li" dense status="later">
              <div className="flex items-center gap-4 px-4 py-2.5">
                <span className="num text-[var(--slate)] shrink-0">
                  {t("week")} {w.week}
                </span>
                <span>{localized(w.task, locale)}</span>
              </div>
            </Card>
          ))}
        </ul>
      </Section>

      {/* المخاطر */}
      <Section title={t("risks")}>
        <ul className="space-y-3">
          {plan.risks.map((r, i) => (
            <Card key={i} as="li" status="danger">
              <div className="p-4 space-y-2">
                <p className="font-bold">{localized(r.risk, locale)}</p>
                <p className="text-sm">{localized(r.mitigation, locale)}</p>
              </div>
            </Card>
          ))}
        </ul>
      </Section>

      {/**
       * قال "مش عارف هجيب عربية ولا لأ" → بنوريه الخطتين بدل ما نقرر عنه.
       * الفرق بينهم ممكن يبقى شهر أو اتنين من عمر فلوسه.
       */}
      {plan.carScenarios && (
        <Section title={t("carTitle")}>
          <Card status="now">
            <div className="space-y-3 p-4">
              <p className="text-sm text-[var(--slate)]">{t("carLead")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["withoutCar", plan.carScenarios.withoutCar],
                    ["withCar", plan.carScenarios.withCar],
                  ] as const
                ).map(([key, s]) => (
                  <div
                    key={key}
                    className="rounded-sm border border-[var(--glass-border)] p-3 space-y-1"
                  >
                    <p className="font-bold">{t(`car.${key}`)}</p>
                    <p className="text-sm">
                      {t("carBurn")} <Money value={Math.round(s.monthlyBurn)} />
                    </p>
                    <p className="text-sm">
                      {t("carRunway")}{" "}
                      <Num>
                        {s.runwayMonths === 99 ? "12+" : s.runwayMonths.toFixed(1)}
                      </Num>{" "}
                      {t("carMonths")}
                    </p>
                    {/**
                     * ⚠️ لازم يبان إن التمن **متخصوم من الرقم اللي فوق**.
                     * من غير السطر ده، اللي بيقرا "٤.٠ شهر" وتحته "وتمنها
                     * $8,000" ممكن يفهم إن لسه لازم يطرحهم بنفسه — أو
                     * الأسوأ، يفتكر إنهم مش داخلين والرقم متفائل.
                     */}
                    {s.upfront > 0 && (
                      <p className="text-xs text-[var(--slate)]">
                        {t("carAfterUpfront")} <Money value={Math.round(s.upfront)} />
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {/**
               * ⚠️ المقارنة كانت بالمصاريف الشهرية بس.
               *
               * يعني العربية كانت بتبان "$400 في الشهر" — والحقيقة إن فيه
               * كمان آلاف بتتدفع **مرة واحدة في الأول** تمن العربية نفسها.
               * اللي بيقرا المقارنة من غير الرقم ده بياخد قرار ناقص.
               */}
              {/**
               * ⚠️ التمن ده **داخل في حسبة الرصيد فوق** دلوقتي.
               *
               * قبل كده كان سطر تنبيهي بس: الرصيد "بعربية" كان متحسوب
               * بالمصاريف الشهرية لوحدها، فالمقارنة كانت بتطلع ٤.٦ شهر
               * مقابل ٤.٠ — فرق نص شهر بيخلي القرار يبان سهل. وفي
               * الحقيقة التمن بيتدفع من نفس الكاش في أول أسبوع، فالرصيد
               * الحقيقي بعربية أقل من كده بكتير.
               */}
              <p className="text-sm">
                {t("carUpfront")} <Money value={USED_CAR_PRICE} />{" "}
                <span className="badge badge--estimated">{tb("estimated")}</span>
              </p>
              <p className="text-sm text-[var(--slate)]">{t("carUpfrontCounted")}</p>
              <p className="text-xs text-[var(--slate)]">
                {USED_CAR_PRICE_FIELD.basis?.[locale] ?? USED_CAR_PRICE_FIELD.basis?.ar}
              </p>

              <p className="text-sm">
                {t("carGap")}{" "}
                <Money
                  value={Math.round(
                    plan.carScenarios.withCar.monthlyBurn -
                      plan.carScenarios.withoutCar.monthlyBurn,
                  )}
                />{" "}
                {t("carPerMonth")}
              </p>
            </div>
          </Card>
        </Section>
      )}

      {/* الأرقام الناقصة — بتتقال صراحة */}
      {plan.unverifiedFields.length > 0 && (
        <Section title={t("unverifiedTitle")}>
          <Card status="now">
            <div className="p-4 space-y-2 text-sm">
              <p>{t("unverifiedLead", { count: plan.unverifiedFields.length })}</p>
              <ul className="flex flex-wrap gap-2">
                {plan.unverifiedFields.slice(0, 12).map((f) => (
                  <li key={f} className="badge badge--needs-verification">
                    <span>{humanField(f, locale)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </Section>
      )}
    </div>
  );
}
