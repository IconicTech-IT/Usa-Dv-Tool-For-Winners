"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Num } from "@/components/Num";
import { localized } from "@/components/FieldValue";
import { useUser } from "@/lib/store/user-store";
import type { Field, Localized } from "@/lib/types";

export interface TimelineStep {
  id: string;
  order: number;
  name: Localized;
  what: Localized;
  durationDays: Field<number>;
}

/**
 * خريطة الرحلة كاملة.
 *
 * ⚠️ بتفتح جاهزة من غير أي مدخلات ومن غير خانة رقم حالة — واحد بيستكشف
 * بيشوف الرحلة كلها وهو داخل الصفحة على طول.
 *
 * متابعة الإجراءات **اختيارية** بيفعّلها هو، وساعتها بس بتظهر التواريخ
 * وتصدير التقويم.
 */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  const t = useTranslations("timeline");
  const locale = useLocale() as "ar" | "en";
  const journey = useUser((s) => s.journey);
  const [tracking, setTracking] = useState(false);

  const setStage = (id: string) =>
    useUser.setState((s) => ({ journey: { ...s.journey, stage: id } }));
  const setDate = (id: string, date: string) =>
    useUser.setState((s) => ({
      journey: { ...s.journey, dates: { ...s.journey.dates, [id]: date } },
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setTracking(!tracking)}
          aria-pressed={tracking}
          className="rounded-sm border border-[var(--glass-border)] px-4 py-2 text-sm"
        >
          {tracking ? t("stopTracking") : t("startTracking")}
        </button>
        <span className="text-sm text-[var(--slate)]">{t("trackingHint")}</span>
      </div>

      <ol className="space-y-3">
        {steps.map((s) => {
          const isCurrent = tracking && journey.stage === s.id;
          const date = journey.dates[s.id];
          return (
            <Card
              key={s.id}
              as="li"
              status={isCurrent ? "now" : date ? "done" : "later"}
            >
              <div className="p-4 space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-bold">
                    <Num>{s.order}</Num>. {localized(s.name, locale)}
                  </h3>
                  <Duration field={s.durationDays} />
                </div>
                <p className="text-sm">{localized(s.what, locale)}</p>

                {tracking && (
                  <div className="flex flex-wrap items-center gap-3 pt-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="stage"
                        checked={journey.stage === s.id}
                        onChange={() => setStage(s.id)}
                      />
                      {t("iAmHere")}
                    </label>
                    <input
                      type="date"
                      dir="ltr"
                      value={date ?? ""}
                      onChange={(e) => setDate(s.id, e.target.value)}
                      className="num rounded-sm border border-[var(--glass-border)] bg-transparent px-2 py-1"
                    />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </ol>

      {tracking && <CalendarExport steps={steps} dates={journey.dates} />}

      <p className="text-sm text-[var(--slate)]">{t("estimateWarning")}</p>
    </div>
  );
}

function Duration({ field }: { field: Field<number> }) {
  const t = useTranslations("timeline");
  const tb = useTranslations("badges");

  if (field.value === null) {
    return <span className="badge badge--needs-verification">{tb("needsVerification")}</span>;
  }
  // المدة بتتعرض كنطاق مش رقم واحد — الرقم الواحد بيوحي بدقة مش موجودة
  const range = field.range ?? [field.value * 0.6, field.value * 1.6];
  return (
    <span className="text-sm text-[var(--slate)]">
      <Num>
        {Math.round(range[0])}–{Math.round(range[1])}
      </Num>{" "}
      {t("days")}
    </span>
  );
}

/** تصدير المواعيد كملف تقويم. بيتعمل في المتصفح — مفيش سيرفر. */
function CalendarExport({
  steps,
  dates,
}: {
  steps: TimelineStep[];
  dates: Record<string, string>;
}) {
  const t = useTranslations("timeline");
  const locale = useLocale() as "ar" | "en";
  const entries = steps.filter((s) => dates[s.id]);

  if (entries.length === 0) return null;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DV Compass//AR//",
    ...entries.flatMap((s) => {
      const d = dates[s.id]!.replace(/-/g, "");
      return [
        "BEGIN:VEVENT",
        `UID:${s.id}@dv-compass`,
        `DTSTART;VALUE=DATE:${d}`,
        `SUMMARY:${localized(s.name, locale)}`,
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ].join("\r\n");

  const href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;

  return (
    <a href={href} download="dv-compass.ics" className="underline underline-offset-4 text-sm">
      {t("exportIcs")}
    </a>
  );
}
