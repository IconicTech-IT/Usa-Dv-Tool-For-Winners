"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { useUser } from "@/lib/store/user-store";
import type { PlannerInput } from "@/lib/types";
import type { PlannerMetro } from "@/lib/planner/metro";

/**
 * سؤال في كل شاشة مع progress bar، وكل إجابة بتتحفظ فورًا في localStorage.
 * ⚠️ مفيش سؤال عن رقم حالة ولا عن مرحلتك — الموقع شغال لواحد مكسبش.
 */

type QuestionId =
  | "money"
  | "moneyIncludesTravel"
  | "monthlyIncomeFromHome"
  | "monthlyDebt"
  | "travellingAlone"
  | "family"
  | "spouseWillWork"
  | "plannedArrival"
  | "host"
  | "hostNights"
  | "englishLevel"
  | "drivingYears"
  | "profession"
  | "openToPhysicalWork"
  | "priorities";

const ORDER: QuestionId[] = [
  "money",
  "moneyIncludesTravel",
  "monthlyIncomeFromHome",
  "monthlyDebt",
  "travellingAlone",
  "family",
  "spouseWillWork",
  "plannedArrival",
  "host",
  "hostNights",
  "englishLevel",
  "drivingYears",
  "profession",
  "openToPhysicalWork",
  "priorities",
];

export function PlannerWizard({
  metros,
  onDone,
}: {
  metros: PlannerMetro[];
  onDone: () => void;
}) {
  const t = useTranslations("planner.questions");
  const tc = useTranslations("planner");
  const profile = useUser((s) => s.profile);
  const setProfile = useUser((s) => s.setProfile);
  const [step, setStep] = useState(0);

  // الأسئلة اللي مش لازمة بتتشال حسب الإجابات السابقة
  const visible = ORDER.filter((q) => {
    if (q === "family" || q === "spouseWillWork") return profile.travellingAlone === false;
    if (q === "hostNights") return Boolean(profile.hostCity);
    return true;
  });

  const current = visible[Math.min(step, visible.length - 1)]!;
  const progress = ((step + 1) / visible.length) * 100;

  const set = (patch: Partial<PlannerInput>) => setProfile(patch);
  const next = () => {
    if (step + 1 >= visible.length) onDone();
    else setStep(step + 1);
  };
  const back = () => setStep(Math.max(0, step - 1));

  return (
    <div className="space-y-5">
      <div
        className="h-1.5 rounded-full bg-[color-mix(in_srgb,var(--slate)_20%,transparent)]"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-[var(--seal)] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <Card status="now">
        <div className="p-6 space-y-5">
          <h2 className="text-xl font-bold">{t(`${current}.q`)}</h2>
          {t.has(`${current}.hint`) && (
            <p className="text-sm text-[var(--slate)]">{t(`${current}.hint`)}</p>
          )}

          <QuestionBody
            id={current}
            profile={profile}
            metros={metros}
            set={set}
            onAnswered={next}
          />

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="text-sm underline underline-offset-4 disabled:opacity-40"
            >
              {tc("back")}
            </button>
            <button
              type="button"
              onClick={next}
              className="rounded-sm border border-[var(--glass-border)] px-4 py-1.5"
            >
              {step + 1 >= visible.length ? tc("seePlan") : tc("next")}
            </button>
          </div>
        </div>
      </Card>

      <p className="text-sm text-[var(--slate)]">{tc("savedLocally")}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function NumberField({
  value,
  onChange,
  prefix,
}: {
  value: number | undefined;
  onChange: (n: number) => void;
  prefix?: string;
}) {
  return (
    <label className="flex items-center gap-2">
      {prefix && <span className="num text-[var(--slate)]">{prefix}</span>}
      <input
        type="number"
        inputMode="decimal"
        dir="ltr"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="num w-40 rounded-sm border border-[var(--glass-border)] bg-transparent px-3 py-2"
      />
    </label>
  );
}

function Choice({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-sm border px-3 py-1.5 text-sm ${
            value === o.value
              ? "border-[var(--seal)] bg-[color-mix(in_srgb,var(--seal)_14%,transparent)]"
              : "border-[var(--glass-border)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function QuestionBody({
  id,
  profile,
  metros,
  set,
}: {
  id: QuestionId;
  profile: Partial<PlannerInput>;
  metros: PlannerMetro[];
  set: (p: Partial<PlannerInput>) => void;
  onAnswered: () => void;
}): ReactNode {
  const t = useTranslations("planner.questions");
  const yesNo = [
    { value: "yes", label: t("yes") },
    { value: "no", label: t("no") },
  ];

  switch (id) {
    case "money":
      return <NumberField value={profile.money} onChange={(n) => set({ money: n })} prefix="$" />;

    case "moneyIncludesTravel":
      return (
        <Choice
          options={yesNo}
          value={profile.moneyIncludesTravel === undefined ? undefined : profile.moneyIncludesTravel ? "yes" : "no"}
          onChange={(v) => set({ moneyIncludesTravel: v === "yes" })}
        />
      );

    case "monthlyIncomeFromHome":
      return (
        <NumberField
          value={profile.monthlyIncomeFromHome}
          onChange={(n) => set({ monthlyIncomeFromHome: n })}
          prefix="$"
        />
      );

    case "monthlyDebt":
      return (
        <NumberField value={profile.monthlyDebt} onChange={(n) => set({ monthlyDebt: n })} prefix="$" />
      );

    case "travellingAlone":
      return (
        <Choice
          options={[
            { value: "alone", label: t("travellingAlone.alone") },
            { value: "family", label: t("travellingAlone.family") },
          ]}
          value={profile.travellingAlone === undefined ? undefined : profile.travellingAlone ? "alone" : "family"}
          onChange={(v) => set({ travellingAlone: v === "alone", adults: v === "alone" ? 1 : 2 })}
        />
      );

    case "family":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm">{t("family.adults")}</span>
            <NumberField value={profile.adults} onChange={(n) => set({ adults: n })} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">{t("family.kids")}</span>
            <NumberField
              value={profile.kidsAges?.length}
              onChange={(n) =>
                set({ kidsAges: Array.from({ length: Math.max(0, n) }, () => 8) })
              }
            />
          </div>
        </div>
      );

    case "spouseWillWork":
      return (
        <Choice
          options={yesNo}
          value={profile.spouseWillWork === undefined ? undefined : profile.spouseWillWork ? "yes" : "no"}
          onChange={(v) => set({ spouseWillWork: v === "yes" })}
        />
      );

    case "plannedArrival":
      // ⚠️ اختياري بالكامل — واحد لسه مكسبش مش هيبقى عنده تاريخ
      return (
        <div className="space-y-2">
          <input
            type="date"
            dir="ltr"
            value={profile.plannedArrival ?? ""}
            onChange={(e) => set({ plannedArrival: e.target.value })}
            className="num rounded-sm border border-[var(--glass-border)] bg-transparent px-3 py-2"
          />
          <button
            type="button"
            onClick={() => set({ plannedArrival: undefined })}
            className="block text-sm underline underline-offset-4"
          >
            {t("plannedArrival.skip")}
          </button>
        </div>
      );

    case "host":
      return (
        <select
          value={profile.hostCity ?? ""}
          onChange={(e) => set({ hostCity: e.target.value || null })}
          className="rounded-sm border border-[var(--glass-border)] bg-transparent px-3 py-2 max-w-full"
        >
          <option value="">{t("host.none")}</option>
          {metros.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name.ar}
            </option>
          ))}
        </select>
      );

    case "hostNights":
      return (
        <NumberField value={profile.hostNights} onChange={(n) => set({ hostNights: n })} />
      );

    case "englishLevel":
      return (
        <Choice
          options={[0, 1, 2, 3, 4].map((n) => ({
            value: String(n),
            label: t(`englishLevel.l${n}`),
          }))}
          value={profile.englishLevel === undefined ? undefined : String(profile.englishLevel)}
          onChange={(v) => set({ englishLevel: Number(v) as PlannerInput["englishLevel"] })}
        />
      );

    case "drivingYears":
      return (
        <NumberField value={profile.drivingYears} onChange={(n) => set({ drivingYears: n })} />
      );

    case "profession":
      return (
        <input
          type="text"
          value={profile.profession ?? ""}
          onChange={(e) => set({ profession: e.target.value })}
          className="w-full rounded-sm border border-[var(--glass-border)] bg-transparent px-3 py-2"
        />
      );

    case "openToPhysicalWork":
      return (
        <Choice
          options={yesNo}
          value={profile.openToPhysicalWork === undefined ? undefined : profile.openToPhysicalWork ? "yes" : "no"}
          onChange={(v) => set({ openToPhysicalWork: v === "yes" })}
        />
      );

    case "priorities": {
      const all: PlannerInput["priorities"] = [
        "fastIncome",
        "lowCost",
        "schools",
        "community",
        "career",
      ];
      const chosen = profile.priorities ?? [];
      return (
        <div className="space-y-2">
          <p className="text-sm text-[var(--slate)]">{t("priorities.hint")}</p>
          <div className="flex flex-wrap gap-2">
            {all.map((p) => {
              const rank = chosen.indexOf(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    set({
                      priorities:
                        rank >= 0
                          ? chosen.filter((x) => x !== p)
                          : [...chosen, p],
                    })
                  }
                  className={`rounded-sm border px-3 py-1.5 text-sm ${
                    rank >= 0
                      ? "border-[var(--seal)] bg-[color-mix(in_srgb,var(--seal)_14%,transparent)]"
                      : "border-[var(--glass-border)]"
                  }`}
                >
                  {rank >= 0 && <span className="num me-1">{rank + 1}.</span>}
                  {t(`priorities.${p}`)}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
  }
}
