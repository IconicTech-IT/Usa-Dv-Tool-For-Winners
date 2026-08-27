"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Money, Num } from "@/components/Num";
import { Link } from "@/i18n/navigation";
import { useUser } from "@/lib/store/user-store";
import { humanField } from "@/lib/content/labels";
import type { Localized } from "@/lib/types";

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
export function MissingNote({
  fields,
  cities,
}: {
  fields: string[];
  /** slug المدينة → اسمها. لو اتبعت، اسم المدينة بيظهر بدل الـslug. */
  cities?: Record<string, Localized>;
}) {
  const t = useTranslations("calculators");
  const locale = useLocale() as "ar" | "en";
  if (fields.length === 0) return null;
  return (
    <Card status="now">
      <div className="p-4 space-y-2 text-sm">
        <p>{t("missingLead", { count: fields.length })}</p>
        <ul className="flex flex-wrap gap-2">
          {fields.map((f) => (
            <li key={f} className="badge badge--needs-verification">
              <span>{humanField(f, locale, cities)}</span>
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

/**
 * "الرقم ده يدخل خطتي" — الجسر بين أي حاسبة دخل والرسم البياني.
 *
 * ⚠️ من غير الكارت ده الحاسبة بتبقى جزيرة: المستخدم يقعد يظبط أميال
 * وساعات لحد ما يطلع رقم حقيقي لدخله، وبعدين يرجع للخطة يلاقيها لسه
 * بترسم بـ$900 اللي إحنا افترضناهم. رقمه هو أصدق من افتراضنا بمراحل،
 * لأنه مبني على شغل بعينه في مدينة بعينها.
 *
 * وبيكتب في نفس المكان اللي الرسمة بتقرا منه (`profile` في الstore)،
 * فالرجوع مش محتاج نسخ ولا لصق.
 */
export function SendIncomeToPlan({ monthly }: { monthly: number }) {
  const t = useTranslations("calculators.sendIncome");
  const setProfile = useUser((s) => s.setProfile);
  const current = useUser((s) => s.profile.expectedMonthlyIncome);
  const [sent, setSent] = useState(false);

  const amount = Math.round(monthly);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const alreadySame = current === amount;

  return (
    <Card status="done">
      <div className="space-y-2 p-4 text-sm">
        <p className="font-bold">{t("title")}</p>
        <p className="text-[var(--slate)]">{t("lead")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setProfile({ expectedMonthlyIncome: amount });
              setSent(true);
            }}
            className="rounded-sm border border-[var(--glass-border)] px-3 py-1.5"
          >
            {t("send")} <Money value={amount} />
          </button>
          {(sent || alreadySame) && (
            <Link href="/planner" className="underline underline-offset-4">
              {t("backToPlan")}
            </Link>
          )}
        </div>
        {(sent || alreadySame) && <p className="text-[var(--seal)]">{t("done")}</p>}
      </div>
    </Card>
  );
}
