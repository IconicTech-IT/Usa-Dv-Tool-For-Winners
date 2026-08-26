"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Num, Money } from "@/components/Num";
import { CountUp } from "@/components/CountUp";
import { Section, Bullets } from "@/components/ui";
import { localized } from "@/components/FieldValue";
import { humanField } from "@/lib/content/labels";
import { useInView, useReducedMotion, DURATION } from "@/lib/motion";
import type { PlanResult } from "@/lib/types";
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

      <BalanceChart plan={plan} />

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
                  </div>
                ))}
              </div>
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

/**
 * لون كل سيناريو في مكان واحد.
 *
 * ⚠️ الخطوط والليجند كانوا منفصلين: الخطوط بألوان مختلفة، والليجند
 * تلات مربعات `■` بتاخد لون النص المحيط — يعني **تلاتتهم بنفس اللون**.
 * فالليجند اللي وظيفته يفرّق بين الخطوط مكانش بيفرّق بين حاجة. دلوقتي
 * الاتنين بيقرأوا من هنا فمستحيل يفترقوا تاني.
 */
const SCENARIOS = {
  slow: { color: "var(--slate)", opacity: 0.6, label: "scenarioSlow" },
  expected: { color: "var(--signal)", opacity: 1, label: "scenarioExpected" },
  fast: { color: "var(--seal)", opacity: 0.6, label: "scenarioFast" },
} as const;

/**
 * رسم الرصيد شهر بشهر تحت ٣ سيناريوهات.
 * SVG خالص — مفيش مكتبة رسوم على الصفحة دي.
 */
function BalanceChart({ plan }: { plan: PlanResult }) {
  const t = useTranslations("planner.result");
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const expectedPath = useRef<SVGPathElement>(null);

  const data = plan.monthlyProjection;

  const W = 640;
  const H = 220;
  const pad = { top: 16, right: 16, bottom: 28, left: 48 };

  const values = data.flatMap((d) => [d.slow, d.expected, d.fast]);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const x = (i: number) => pad.left + (i / (data.length - 1)) * (W - pad.left - pad.right);
  const y = (v: number) => pad.top + ((max - v) / range) * (H - pad.top - pad.bottom);

  const line = (key: "slow" | "expected" | "fast") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d[key])}`).join(" ");

  // أول شهر الرصيد بيلمس الصفر في السيناريو المتوقع
  const zeroIndex = data.findIndex((d) => d.expected <= 0);

  // الخط بيترسم من أول الشهور لآخرها. الرسم ده أهم من إنه شكل حلو:
  // بيخلي عين المستخدم تمشي مع الرصيد وهو بينزل لحد ما يلمس الصفر.
  useEffect(() => {
    const el = expectedPath.current;
    if (!el) return;
    const length = el.getTotalLength();

    if (reduced || !inView) {
      el.style.strokeDasharray = "none";
      el.style.strokeDashoffset = "0";
      return;
    }

    el.style.strokeDasharray = String(length);
    el.style.strokeDashoffset = String(length);
    el.getBoundingClientRect(); // إجبار reflow قبل ما الانتقال يبدأ
    el.style.transition = `stroke-dashoffset ${DURATION.chart}ms ease-out`;
    el.style.strokeDashoffset = "0";
  }, [inView, reduced, data]);

  // ⚠️ الخروج بدري لازم يبقى بعد كل الhooks — مش قبلهم
  if (data.length === 0) return null;

  return (
    <Section title={t("balance")}>
      <Card>
        <div ref={ref} className="p-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full min-w-[520px]"
            role="img"
            aria-label={t("balanceAria")}
          >
            {/* خط الصفر الأحمر */}
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={y(0)}
              y2={y(0)}
              stroke="var(--alert)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <path
              d={line("slow")}
              fill="none"
              stroke={SCENARIOS.slow.color}
              strokeWidth="1.5"
              opacity={SCENARIOS.slow.opacity}
            />
            <path
              d={line("fast")}
              fill="none"
              stroke={SCENARIOS.fast.color}
              strokeWidth="1.5"
              opacity={SCENARIOS.fast.opacity}
            />
            <path
              ref={expectedPath}
              d={line("expected")}
              fill="none"
              stroke={SCENARIOS.expected.color}
              strokeWidth="2.5"
            />

            {zeroIndex >= 0 && (
              <>
                <circle
                  cx={x(zeroIndex)}
                  cy={y(0)}
                  r="5"
                  fill="var(--alert)"
                  style={{
                    opacity: reduced || inView ? 1 : 0,
                    transition: `opacity 300ms ease ${DURATION.chart}ms`,
                  }}
                />
                <text
                  x={x(zeroIndex)}
                  y={y(0) - 10}
                  textAnchor="middle"
                  fill="var(--alert)"
                  fontSize="12"
                  style={{
                    opacity: reduced || inView ? 1 : 0,
                    transition: `opacity 400ms ease ${DURATION.chart}ms`,
                  }}
                >
                  {t("moneyRunsOut")}
                </text>
              </>
            )}

            {data.map((d, i) =>
              i % 3 === 0 ? (
                <text
                  key={i}
                  x={x(i)}
                  y={H - 8}
                  textAnchor="middle"
                  fill="var(--slate)"
                  fontSize="11"
                >
                  {d.month}
                </text>
              ) : null,
            )}
          </svg>

          <ul className="flex flex-wrap gap-4 pt-3 text-sm text-[var(--slate)]">
            {(["slow", "expected", "fast"] as const).map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-[2px]"
                  style={{
                    background: SCENARIOS[k].color,
                    opacity: SCENARIOS[k].opacity,
                  }}
                />
                {t(SCENARIOS[k].label)}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </Section>
  );
}
