"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Money, Num } from "@/components/Num";
import { Section } from "@/components/ui";
import { useInView, useReducedMotion, DURATION } from "@/lib/motion";
import { Link } from "@/i18n/navigation";
import type { PlanResult } from "@/lib/types";

type Point = PlanResult["monthlyProjection"][number];
type ScenarioKey = "slow" | "expected" | "fast";

/**
 * لون كل سيناريو في مكان واحد.
 *
 * ⚠️ الخطوط والليجند كانوا منفصلين: الخطوط بألوان مختلفة، والليجند
 * تلات مربعات `■` بتاخد لون النص المحيط — يعني **تلاتتهم بنفس اللون**.
 * فالليجند اللي وظيفته يفرّق بين الخطوط مكانش بيفرّق بين حاجة. دلوقتي
 * الاتنين بيقرأوا من هنا فمستحيل يفترقوا تاني.
 */
const SCENARIOS: Record<
  ScenarioKey,
  { color: string; width: number; dash?: string; label: string }
> = {
  slow: { color: "var(--slate)", width: 1.5, dash: "5 4", label: "scenarioSlow" },
  expected: { color: "var(--signal)", width: 3, label: "scenarioExpected" },
  fast: { color: "var(--seal)", width: 1.5, label: "scenarioFast" },
};

const W = 720;
const H = 264;
const PAD = { top: 22, right: 18, bottom: 36, left: 62 };

/** ‎$12k · $850 · -$2.4k — قصير عشان يدخل على محور ضيق من غير ما يتقصف. */
function axisMoney(v: number): string {
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 10_000) return `${sign}$${Math.round(a / 1000)}k`;
  if (a >= 1_000) return `${sign}$${(a / 1000).toFixed(1)}k`;
  return `${sign}$${Math.round(a)}`;
}

/**
 * الرصيد شهر بشهر — نفس الرسمة في الخطة وفي حاسبة الرصيد.
 *
 * ⚠️ **الرسمة دي كانت بتحكي حكاية تانية غير الرقم اللي فوقها.** الرقم
 * الكبير ("فلوسك تكفي ٤ شهور") محسوب بدخل **صفر**، والرسمة كانت بترسم
 * خط اسمه "دخل متوقع" بيعلّي الرصيد بفلوس مفترضة — من غير ما تقول
 * متوقع كام ولا من إمتى. فاللي بيبص على الرسمة كان بيطمن على دخل
 * محدش وعده بيه. دلوقتي كل خط مكتوب جنبه افتراضه بالدولار بالحرف،
 * والسيناريو البطيء (اللي هو نفس حسبة الرقم الكبير) بقى أول واحد
 * في الليجند مش آخر واحد.
 *
 * SVG خالص — مفيش مكتبة رسوم على الصفحة دي.
 */
export function BalanceChart({
  data,
  assumption,
  incomeToolHref,
}: {
  data: Point[];
  assumption: PlanResult["incomeAssumption"];
  /** لينك الحاسبة اللي بتطلع رقم الدخل — بيظهر بس لما الرقم تقديرنا */
  incomeToolHref?: string;
}) {
  const t = useTranslations("balance");
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const expectedPath = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradId = useId();

  /** الشهر اللي المستخدم واقف عليه — null يعني مفيش */
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const last = data.length - 1;

  const values = data.flatMap((d) => [d.slow, d.expected, d.fast]);
  const rawMax = Math.max(...values, 0);
  const rawMin = Math.min(...values, 0);
  // مساحة صغيرة فوق عشان الخط ميلزقش في حرف الرسمة
  const headroom = (rawMax - rawMin || 1) * 0.08;
  const max = rawMax + headroom;
  /**
   * ⚠️ المحور بينزل تحت الصفر **بس لو الرصيد بينزل تحت الصفر فعلًا**.
   *
   * كان بينزل دايمًا بمقدار الheadroom، فواحد رصيده مبيلمسش الصفر
   * في السنة كلها كان بيشوف المنطقة الحمرا ("تحت الصفر") مرسومة تحت
   * خطه وعليها علامة بالسالب. يعني الرسمة بتوريه خطر مش موجود في
   * أرقامه — وده نفس نوع الغلط اللي الرسمة دي المفروض تصلحه.
   */
  const min = rawMin < 0 ? rawMin - headroom : 0;
  const range = max - min || 1;

  const x = useCallback(
    (i: number) => PAD.left + (last > 0 ? i / last : 0) * (W - PAD.left - PAD.right),
    [last],
  );
  const y = useCallback(
    (v: number) => PAD.top + ((max - v) / range) * (H - PAD.top - PAD.bottom),
    [max, range],
  );

  const line = (key: ScenarioKey) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d[key])}`).join(" ");

  /**
   * الشريط بين البطيء والسريع = المدى المحتمل.
   * ⚠️ أهم من تلات خطوط منفصلة: بيقول "النتيجة في أي مكان في الرقعة دي"
   * بدل ما يوحي إن فيه تلات مسارات محددة.
   */
  const band =
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.fast)}`).join(" ") +
    " " +
    data
      .map((d, i) => ({ d, i }))
      .reverse()
      .map(({ d, i }) => `L ${x(i)} ${y(d.slow)}`)
      .join(" ") +
    " Z";

  // أول شهر الرصيد بيلمس الصفر في كل سيناريو
  const zeroIn = (key: ScenarioKey) => {
    const hit = data.find((d) => d[key] <= 0);
    return hit ? hit.month : null;
  };
  const zeroSlow = zeroIn("slow");
  const zeroExpected = zeroIn("expected");
  const zeroIndex = data.findIndex((d) => d.expected <= 0);

  /**
   * خطوط شبكة أفقية بأرقام — المساحة اليسرى كانت محجوزة ٦٢px وفاضية.
   *
   * ⚠️ **الصفر لازم يبقى مكتوب**. هو الخط الوحيد اللي ليه معنى في
   * الرسمة كلها ("هنا فلوسك بتخلص")، وكان مرسوم من غير رقم جنبه —
   * فاللي بيقيس بعينه مكانش عارف الخط الأحمر ده واقف عند كام.
   */
  const ticks = (() => {
    const out = new Set<number>([0]);
    const steps = 3;
    for (let i = 0; i <= steps; i++) {
      const v = Math.round(min + (range * i) / steps);
      // مش بنزحم الصفر بعلامة ملزوقة فيه
      if (Math.abs(v) > range * 0.08) out.add(v);
    }
    return [...out].sort((a, b) => b - a);
  })();

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

  /**
   * ⚠️ الرسمة لازم تشتغل باللمس وبالكيبورد مش بالماوس بس.
   * أغلب مستخدمين الموقع على موبايل — رسمة بتتقرا بالـhover بس يعني
   * أغلب الناس مش هيشوفوا ولا رقم منها.
   */
  const pickFromPointer = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg || last <= 0) return;
    const box = svg.getBoundingClientRect();
    if (box.width === 0) return;
    const px = ((clientX - box.left) / box.width) * W;
    const ratio = (px - PAD.left) / (W - PAD.left - PAD.right);
    setActive(Math.round(Math.min(1, Math.max(0, ratio)) * last));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.min(last, (a ?? -1) + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.max(0, (a ?? last + 1) - 1));
    } else if (e.key === "Escape") {
      setActive(null);
    }
  };

  if (data.length === 0) return null;

  const point = active === null ? null : data[active];

  return (
    <Section title={t("title")}>
      <div className="space-y-3">
        {/**
         * ⚠️ الجملة دي قبل الرسمة بقصد.
         * الرسمة محتاجة قراية؛ الجملة دي بتدي الخلاصة لواحد بيسكرول
         * بسرعة أو بيقرا بقارئ شاشة. والاتنين بيقولوا نفس الحاجة
         * لأنهم بيقروا من نفس الداتا.
         */}
        <Card status={zeroSlow !== null && zeroSlow <= 3 ? "danger" : "now"}>
          <div className="p-4 text-sm space-y-1">
            <p>
              {t("noIncomeLead")}{" "}
              {zeroSlow === null ? (
                <strong>{t("holdsAllYear")}</strong>
              ) : (
                <strong>
                  {t("runsOutIn")} <Num>{zeroSlow}</Num>
                </strong>
              )}
            </p>
            <p className="text-[var(--slate)]">
              {t("withIncomeLead", { amount: assumption.expected })}{" "}
              {zeroExpected === null ? (
                <strong className="text-[var(--seal)]">{t("holdsAllYear")}</strong>
              ) : (
                <strong>
                  {t("runsOutIn")} <Num>{zeroExpected}</Num>
                </strong>
              )}
            </p>
          </div>
        </Card>

        <Card>
          <div ref={ref} className="p-4 space-y-3">
            {/* الرسمة LTR دايمًا — الزمن بيمشي من الشمال لليمين في اللغتين */}
            <div dir="ltr" className="overflow-x-auto">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                className="w-full min-w-[520px] touch-none"
                role="img"
                aria-label={t("aria")}
                tabIndex={0}
                onKeyDown={onKey}
                onPointerMove={(e) => pickFromPointer(e.clientX)}
                onPointerDown={(e) => pickFromPointer(e.clientX)}
                onPointerLeave={() => setActive(null)}
                onBlur={() => setActive(null)}
              >
                <defs>
                  <linearGradient id={`${gradId}-band`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--seal)" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="var(--signal)" stopOpacity="0.06" />
                  </linearGradient>
                </defs>

                {/**
                 * ⚠️ منطقة تحت الصفر متظللة بالأحمر.
                 * خط منقّط لوحده بيتقرا كخط تاني في الرسمة. المساحة
                 * الملونة بتقول "الجزء ده من الرسمة معناه إنك مديون".
                 */}
                {min < 0 && (
                  <rect
                    x={PAD.left}
                    y={y(0)}
                    width={W - PAD.left - PAD.right}
                    height={Math.max(0, H - PAD.bottom - y(0))}
                    fill="var(--alert)"
                    opacity="0.07"
                  />
                )}

                {/* شبكة أفقية بأرقام — المساحة دي كانت محجوزة وفاضية */}
                {ticks.map((v) => (
                  <g key={v}>
                    <line
                      x1={PAD.left}
                      x2={W - PAD.right}
                      y1={y(v)}
                      y2={y(v)}
                      stroke="var(--glass-border)"
                      strokeWidth="1"
                    />
                    <text
                      x={PAD.left - 8}
                      y={y(v) + 4}
                      textAnchor="end"
                      fill="var(--slate)"
                      fontSize="11"
                      fontFamily="var(--font-mono)"
                    >
                      {axisMoney(v)}
                    </text>
                  </g>
                ))}

                <path d={band} fill={`url(#${gradId}-band)`} stroke="none" />

                {/* خط الصفر — الحد اللي الرسمة كلها بتتقاس عليه */}
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(0)}
                  y2={y(0)}
                  stroke="var(--alert)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {(["slow", "fast"] as const).map((k) => (
                  <path
                    key={k}
                    d={line(k)}
                    fill="none"
                    stroke={SCENARIOS[k].color}
                    strokeWidth={SCENARIOS[k].width}
                    strokeDasharray={SCENARIOS[k].dash}
                    strokeLinecap="round"
                  />
                ))}

                <path
                  ref={expectedPath}
                  d={line("expected")}
                  fill="none"
                  stroke={SCENARIOS.expected.color}
                  strokeWidth={SCENARIOS.expected.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {zeroIndex >= 0 && (
                  <g
                    style={{
                      opacity: reduced || inView ? 1 : 0,
                      transition: `opacity 400ms ease ${DURATION.chart}ms`,
                    }}
                  >
                    <line
                      x1={x(zeroIndex)}
                      x2={x(zeroIndex)}
                      y1={y(0)}
                      y2={PAD.top}
                      stroke="var(--alert)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity="0.6"
                    />
                    <circle cx={x(zeroIndex)} cy={y(0)} r="5" fill="var(--alert)" />
                    <text
                      x={x(zeroIndex)}
                      y={PAD.top - 6}
                      textAnchor="middle"
                      fill="var(--alert)"
                      fontSize="12"
                    >
                      {t("moneyRunsOut")}
                    </text>
                  </g>
                )}

                {/* الشهر اللي المستخدم واقف عليه */}
                {point && active !== null && (
                  <g>
                    <line
                      x1={x(active)}
                      x2={x(active)}
                      y1={PAD.top}
                      y2={H - PAD.bottom}
                      stroke="var(--ink)"
                      strokeWidth="1"
                      opacity="0.35"
                    />
                    {(["slow", "expected", "fast"] as const).map((k) => (
                      <circle
                        key={k}
                        cx={x(active)}
                        cy={y(point[k])}
                        r={k === "expected" ? 5 : 3.5}
                        fill="var(--paper)"
                        stroke={SCENARIOS[k].color}
                        strokeWidth="2"
                      />
                    ))}
                  </g>
                )}

                {data.map((d, i) =>
                  i % 3 === 0 || i === last ? (
                    <text
                      key={d.month}
                      x={x(i)}
                      y={H - 10}
                      textAnchor="middle"
                      fill={active === i ? "var(--ink)" : "var(--slate)"}
                      fontSize="11"
                      fontFamily="var(--font-mono)"
                    >
                      {d.month}
                    </text>
                  ) : null,
                )}
              </svg>
            </div>

            {/**
             * ⚠️ القراية دي مكانها ثابت.
             * لو كانت tooltip طايرة فوق الرسمة كانت هتغطي الخط اللي
             * المستخدم بيقرا منه، وعلى الموبايل صباعه كمان هيغطيه.
             */}
            <div className="min-h-[3.25rem] rounded-sm border border-[var(--glass-border)] p-3 text-sm">
              {point ? (
                <div className="space-y-1">
                  <div className="font-medium">
                    {t("monthLabel")} <Num>{point.month}</Num>
                  </div>
                  <ul className="flex flex-wrap gap-x-5 gap-y-1">
                    {(["slow", "expected", "fast"] as const).map((k) => (
                      <li key={k} className="flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="inline-block h-2.5 w-2.5 rounded-[2px]"
                          style={{ background: SCENARIOS[k].color }}
                        />
                        <span className="text-[var(--slate)]">{t(SCENARIOS[k].label)}</span>
                        <span className={point[k] < 0 ? "text-[var(--alert)]" : ""}>
                          <Money value={point[k]} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[var(--slate)]">{t("hoverHint")}</p>
              )}
            </div>

            {/**
             * ⚠️ الليجند بيقول الافتراض بالدولار.
             * "دخل متوقع" لوحدها مش معلومة — متوقع كام؟ من إمتى؟ ومين
             * اللي توقّع؟ التلات إجابات دي هنا دلوقتي.
             */}
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-start gap-2">
                <Swatch k="slow" />
                <span>
                  <span className="font-medium">{t("scenarioSlow")}</span>{" "}
                  <span className="text-[var(--slate)]">{t("slowBasis")}</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Swatch k="expected" />
                <span>
                  <span className="font-medium">{t("scenarioExpected")}</span>{" "}
                  <span className="text-[var(--slate)]">
                    {t("incomeBasis", {
                      amount: assumption.expected,
                      month: assumption.startsInMonth,
                    })}
                  </span>{" "}
                  <span className="badge badge--estimated">
                    {assumption.fromUser ? t("yourNumber") : t("ourGuess")}
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Swatch k="fast" />
                <span>
                  <span className="font-medium">{t("scenarioFast")}</span>{" "}
                  <span className="text-[var(--slate)]">
                    {t("incomeBasis", {
                      amount: assumption.fast,
                      month: assumption.startsInMonth,
                    })}
                  </span>
                </span>
              </li>
            </ul>

            {/**
             * ⚠️ الافتراض من غير طريقة تغيّره بيبقى شكوى مش أداة.
             * لو الرقم تقديرنا، بنوري اللينك اللي بيوصله لرقمه هو.
             */}
            {!assumption.fromUser && incomeToolHref && (
              <p className="text-sm">
                <Link href={incomeToolHref} className="underline underline-offset-4">
                  {t("calcYourIncome")}
                </Link>
              </p>
            )}

            <div>
              <button
                type="button"
                onClick={() => setShowTable((v) => !v)}
                aria-expanded={showTable}
                className="text-sm underline underline-offset-4"
              >
                {showTable ? t("hideTable") : t("showTable")}
              </button>
            </div>

            {/**
             * الأرقام نفسها لمن عايز يقراها بدل ما يقيسها بعينه من الرسمة.
             * البار الأفقي بيدي إحساس الحجم جنب الرقم على طول.
             */}
            {showTable && (
              <ul className="space-y-1">
                {data.map((d) => {
                  const pct = rawMax > 0 ? Math.max(0, Math.min(1, d.expected / rawMax)) : 0;
                  return (
                    <li
                      key={d.month}
                      className="flex items-center gap-3 border-b border-[var(--glass-border)] py-1.5 text-sm last:border-0"
                    >
                      <span className="w-16 shrink-0 text-[var(--slate)]">
                        {t("monthLabel")} <Num>{d.month}</Num>
                      </span>
                      <span
                        aria-hidden="true"
                        className="h-1.5 min-w-[2px] flex-1 rounded-full"
                        style={{
                          background: d.expected < 0 ? "var(--alert)" : "var(--seal)",
                          opacity: d.expected < 0 ? 0.9 : 0.35 + pct * 0.55,
                          maxWidth: `${Math.max(4, pct * 100)}%`,
                        }}
                      />
                      <span
                        className={`shrink-0 ${d.expected < 0 ? "text-[var(--alert)]" : ""}`}
                      >
                        <Money value={d.expected} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </Section>
  );
}

function Swatch({ k }: { k: ScenarioKey }) {
  return (
    <span
      aria-hidden="true"
      className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
      style={{ background: SCENARIOS[k].color }}
    />
  );
}
