"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Num } from "@/components/Num";

export function CalcField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      {children}
    </label>
  );
}

export function NumInput({
  value,
  onChange,
  prefix,
  suffix,
  step,
}: {
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <span className="flex items-center gap-1">
      {prefix && <span className="num text-[var(--slate)]">{prefix}</span>}
      <input
        type="number"
        dir="ltr"
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="num w-32 rounded-sm border border-[var(--glass-border)] bg-[var(--field-bg)] px-3 py-1.5"
      />
      {suffix && <span className="text-sm text-[var(--slate)]">{suffix}</span>}
    </span>
  );
}

/** الرقم اللي الصفحة كلها بتشرحه. واحد بس. */
export function BigResult({
  label,
  value,
  hint,
  missing,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  missing?: boolean;
}) {
  const t = useTranslations("badges");
  return (
    <Card status={missing ? "now" : "done"}>
      <div className="p-6 space-y-1">
        <div className="text-sm text-[var(--slate)]">{label}</div>
        {missing ? (
          <div className="badge badge--needs-verification text-base">
            {t("needsVerification")}
          </div>
        ) : (
          <div className="text-5xl font-bold">
            <Num>{value}</Num>
          </div>
        )}
        {hint && <div className="text-sm text-[var(--slate)]">{hint}</div>}
      </div>
    </Card>
  );
}

/** الحقول اللي الحسبة اعتمدت عليها وهي ناقصة — بتتقال صراحة. */
export function MissingNote({ fields }: { fields: string[] }) {
  const t = useTranslations("calculators");
  if (fields.length === 0) return null;
  return (
    <Card status="now">
      <div className="p-4 space-y-2 text-sm">
        <p>{t("missingLead", { count: fields.length })}</p>
        <ul className="flex flex-wrap gap-2">
          {fields.map((f) => (
            <li key={f} className="badge badge--needs-verification">
              <span className="num">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/** سنة الضرايب في الداتا مش السنة الحالية. */
export function StaleTaxYear({ year }: { year: number | null }) {
  const t = useTranslations("calculators");
  if (year === null) return null;
  return (
    <Card status="danger">
      <div className="p-4 text-sm">{t("staleTaxYear", { year })}</div>
    </Card>
  );
}
