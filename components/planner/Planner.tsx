"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Money, Num } from "@/components/Num";
import { CountUp } from "@/components/CountUp";
import { Section } from "@/components/ui";
import { localized } from "@/components/FieldValue";
import { useUser } from "@/lib/store/user-store";
import { computePlan, computeRequired } from "@/lib/planner/engine";
import type { PlannerMetro } from "@/lib/planner/metro";
import type { PlanDirection, PlannerInput } from "@/lib/types";
import { PlannerWizard } from "./PlannerWizard";
import { PlanResultView } from "./PlanResultView";
import { CostEditor } from "./CostEditor";

/** القيم الافتراضية — الخطة بتشتغل حتى لو المستخدم جاوب على سؤال واحد بس. */
function fill(p: Partial<PlannerInput>): PlannerInput {
  return {
    money: p.money ?? 0,
    moneyIncludesTravel: p.moneyIncludesTravel ?? false,
    monthlyIncomeFromHome: p.monthlyIncomeFromHome ?? 0,
    monthlyDebt: p.monthlyDebt ?? 0,
    travellingAlone: p.travellingAlone ?? true,
    adults: p.adults ?? 1,
    kidsAges: p.kidsAges ?? [],
    spouseWillWork: p.spouseWillWork ?? false,
    plannedArrival: p.plannedArrival,
    hostCity: p.hostCity ?? null,
    hostNights: p.hostNights ?? 0,
    englishLevel: p.englishLevel ?? 1,
    drivingYears: p.drivingYears ?? 0,
    profession: p.profession ?? "",
    openToPhysicalWork: p.openToPhysicalWork ?? true,
    priorities: p.priorities?.length
      ? p.priorities
      : ["fastIncome", "lowCost", "community", "schools", "career"],
  };
}

export function Planner({ metros }: { metros: PlannerMetro[] }) {
  const t = useTranslations("planner");
  const [direction, setDirection] = useState<PlanDirection>("have");

  return (
    <div className="space-y-6">
      {/* اتجاهين على نفس المحرك */}
      <div className="flex flex-wrap gap-2" role="tablist">
        {(["have", "need"] as PlanDirection[]).map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={direction === d}
            onClick={() => setDirection(d)}
            className={`rounded-sm border px-4 py-2 ${
              direction === d
                ? "border-[var(--seal)] bg-[color-mix(in_srgb,var(--seal)_14%,transparent)]"
                : "border-[var(--glass-border)]"
            }`}
          >
            {t(`direction.${d}`)}
          </button>
        ))}
      </div>

      {direction === "have" ? (
        <HaveDirection metros={metros} />
      ) : (
        <NeedDirection metros={metros} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * "معايا كام؟"
 * ------------------------------------------------------------------ */

function HaveDirection({ metros }: { metros: PlannerMetro[] }) {
  const t = useTranslations("planner");
  const locale = useLocale() as "ar" | "en";
  const profile = useUser((s) => s.profile);
  const setPlan = useUser((s) => s.setPlan);
  const overrides = useUser((s) => s.overrides);
  /**
   * ⚠️ الحالة دي مشتقة مش مجمّدة.
   * zustand بيرجّع الداتا من localStorage **بعد** أول render، فلو
   * جمّدنا القرار في useState الأولاني هيتحسب والstore لسه فاضي،
   * وحد راجع وبياناته محفوظة هيلاقي الأسئلة من الأول تاني.
   * فبنمسك "بيعدّل دلوقتي؟" بس، والباقي بيتحسب من الstore كل render.
   */
  const [editing, setEditing] = useState(false);
  const showResult = Boolean(profile.money) && !editing;

  const plan = useMemo(
    () => computePlan(fill(profile), metros, overrides),
    [profile, metros, overrides],
  );

  // الخطة بتتحدث لحظيًا مع أي تعديل، وبتتحفظ عشان شريط الخطة يقراها
  const done = () => {
    setPlan(plan);
    setEditing(false);
  };

  if (!showResult) {
    return <PlannerWizard metros={metros} onDone={done} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm underline underline-offset-4"
        >
          {t("editAnswers")}
        </button>
        <span className="text-sm text-[var(--slate)]">{t("liveUpdate")}</span>
      </div>
      <PlanResultView
        plan={plan}
        metroName={(() => {
          const m = metros.find((x) => x.slug === plan.chosenMetro);
          return m ? localized(m.name, locale) : undefined;
        })()}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * "محتاج كام؟" — نفس المحرك بالظبط، معكوس
 * ------------------------------------------------------------------ */

function NeedDirection({ metros }: { metros: PlannerMetro[] }) {
  const t = useTranslations("planner.need");
  const locale = useLocale() as "ar" | "en";
  const profile = useUser((s) => s.profile);
  const setProfile = useUser((s) => s.setProfile);
  const overrides = useUser((s) => s.overrides);

  const [metro, setMetro] = useState(metros[0]?.slug ?? "");
  const [months, setMonths] = useState(3);
  const [includeTravel, setIncludeTravel] = useState(true);

  const adults = profile.adults ?? 1;
  // ⚠️ من غير useMemo، المصفوفة دي بتتعمل من الأول كل render
  // فالحسبة تحت بتعيد نفسها كل مرة من غير داعي
  const kids = useMemo(() => profile.kidsAges ?? [], [profile.kidsAges]);

  const result = useMemo(
    () =>
      computeRequired(
        {
          metro,
          adults,
          kidsAges: kids,
          monthsWithoutWork: months,
          includeTravel,
          monthlyIncomeFromHome: profile.monthlyIncomeFromHome ?? 0,
        },
        metros,
        overrides,
      ),
    [
      metro,
      adults,
      kids,
      months,
      includeTravel,
      profile.monthlyIncomeFromHome,
      metros,
      overrides,
    ],
  );

  return (
    <div className="space-y-6">
      <Card status="now">
        <div className="p-5 space-y-4">
          <p className="text-[var(--slate)]">{t("lead")}</p>

          <label className="flex flex-wrap items-center gap-2">
            <span className="text-sm">{t("city")}</span>
            <select
              value={metro}
              onChange={(e) => setMetro(e.target.value)}
              className="rounded-sm border border-[var(--glass-border)] bg-transparent px-3 py-2"
            >
              {metros.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {localized(m.name, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-wrap items-center gap-2">
            <span className="text-sm">{t("adults")}</span>
            <input
              type="number"
              dir="ltr"
              min={1}
              value={adults}
              onChange={(e) => setProfile({ adults: Number(e.target.value) })}
              className="num w-20 rounded-sm border border-[var(--glass-border)] bg-transparent px-3 py-2"
            />
            <span className="text-sm">{t("kids")}</span>
            <input
              type="number"
              dir="ltr"
              min={0}
              value={kids.length}
              onChange={(e) =>
                setProfile({
                  kidsAges: Array.from({ length: Math.max(0, Number(e.target.value)) }, () => 8),
                })
              }
              className="num w-20 rounded-sm border border-[var(--glass-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="flex flex-wrap items-center gap-2">
            <span className="text-sm">{t("months")}</span>
            <input
              type="range"
              min={1}
              max={12}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="flex-1 min-w-40"
            />
            <Num>{months}</Num>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeTravel}
              onChange={(e) => setIncludeTravel(e.target.checked)}
            />
            {t("includeTravel")}
          </label>
        </div>
      </Card>

      {result && !result.computable && (
        <>
          <Card status="danger">
            <div className="p-6 space-y-2">
              <h2 className="text-xl font-bold">{t("cannotCompute")}</h2>
              <p>{t("cannotComputeWhy")}</p>
            </div>
          </Card>
          {/* مش طريق مسدود — المستخدم يقدر يفكها بأرقامه هو */}
          <CostEditor
            metroSlug={result.metro}
            metroName={localized(
              metros.find((x) => x.slug === result.metro)?.name ?? { ar: "", en: "" },
              locale,
            )}
            landing={result.landingBreakdown}
            burn={result.burnBreakdown}
            highlight={result.missingEssential}
          />
        </>
      )}

      {result && result.computable && (
        <>
          <Card status="done">
            <div className="p-6 space-y-2">
              <div className="text-sm text-[var(--slate)]">{t("youNeed")}</div>
              <div className="text-5xl font-bold">
                <CountUp value={result.totalNeeded} prefix="$" />
              </div>
              <p className="text-sm text-[var(--slate)]">
                {t("breakdownHint", { months: result.monthsWithoutWork })}
              </p>
            </div>
          </Card>

          <Section title={t("breakdown")}>
            <ul className="space-y-2">
              {result.breakdown
                .filter((b) => b.amount > 0)
                .map((b) => (
                  <Card key={b.key} as="li" dense>
                    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                      <span>{localized(b.label, locale)}</span>
                      <Money value={b.amount} />
                    </div>
                  </Card>
                ))}
            </ul>
          </Section>

          <CostEditor
            metroSlug={result.metro}
            metroName={localized(
              metros.find((x) => x.slug === result.metro)?.name ?? { ar: "", en: "" },
              locale,
            )}
            landing={result.landingBreakdown}
            burn={result.burnBreakdown}
          />

          {result.unverifiedFields.length > 0 && (
            <Card status="now">
              <div className="p-4 text-sm space-y-2">
                <p>{t("unverified", { count: result.unverifiedFields.length })}</p>
                <ul className="flex flex-wrap gap-2">
                  {result.unverifiedFields.map((f) => (
                    <li key={f} className="badge badge--needs-verification">
                      <span className="num">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
