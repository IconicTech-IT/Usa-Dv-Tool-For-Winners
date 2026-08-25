"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Num, Money } from "@/components/Num";
import { CountUp } from "@/components/CountUp";
import { Section, Bullets } from "@/components/ui";
import { localized } from "@/components/FieldValue";
import { useInView, useReducedMotion, DURATION } from "@/lib/motion";
import type { PlanResult } from "@/lib/types";

/**
 * مخرجات الخطة.
 *
 * ⚠️ الرسم البياني بيوقف عند خط الصفر ويقول "هنا فلوسك بتخلص" —
 * ده أهم مشهد في الموقع. والحقول اللي لسه محتاجة تأكيد بتتقال صراحة
 * تحت، مش بتتخبى.
 */
export function PlanResultView({ plan }: { plan: PlanResult }) {
  const t = useTranslations("planner.result");
  const locale = useLocale() as "ar" | "en";

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
          <p className="text-sm text-[var(--slate)]">
            {t("tier")} <strong>{plan.tier}</strong> · {t("monthlyBurn")}{" "}
            <Money value={Math.round(plan.monthlyBurn)} /> · {t("landingCost")}{" "}
            <Money value={Math.round(plan.landingCost)} />
          </p>
        </div>
      </Card>

      {/* المدن المرشحة */}
      <Section title={t("recommended")}>
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

      {/* الأرقام الناقصة — بتتقال صراحة */}
      {plan.unverifiedFields.length > 0 && (
        <Section title={t("unverifiedTitle")}>
          <Card status="now">
            <div className="p-4 space-y-2 text-sm">
              <p>{t("unverifiedLead", { count: plan.unverifiedFields.length })}</p>
              <ul className="flex flex-wrap gap-2">
                {plan.unverifiedFields.slice(0, 12).map((f) => (
                  <li key={f} className="badge badge--needs-verification">
                    <span className="num">{f}</span>
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
            <path d={line("slow")} fill="none" stroke="var(--slate)" strokeWidth="1.5" opacity="0.6" />
            <path d={line("fast")} fill="none" stroke="var(--seal)" strokeWidth="1.5" opacity="0.6" />
            <path
              ref={expectedPath}
              d={line("expected")}
              fill="none"
              stroke="var(--signal)"
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
            <li>■ {t("scenarioSlow")}</li>
            <li>■ {t("scenarioExpected")}</li>
            <li>■ {t("scenarioFast")}</li>
          </ul>
        </div>
      </Card>
    </Section>
  );
}
