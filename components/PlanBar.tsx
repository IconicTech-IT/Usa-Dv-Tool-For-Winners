"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useUser } from "@/lib/store/user-store";
import { CountUp } from "./CountUp";
import { Money } from "./Num";

/**
 * شريط الخطة — العنصر اللي الموقع هيتفتكر بيه.
 *
 * بيعرض أهم رقم في خطتك: كام شهر فلوسك تكفيك.
 * فاضي = خانة "معاك كام؟" — أقصر طريق من فتح الموقع لأول قيمة حقيقية.
 *
 * ⚠️ مفيش عدّاد مواعيد هنا ومفيش رقم حالة. الشريط شغال ومفيد
 * لواحد لسه مكسبش ومش مقدّم. المواعيد بتظهر **بس** لو المستخدم
 * فعّل متابعة الإجراءات وحط تواريخه بنفسه.
 */
export function PlanBar() {
  const t = useTranslations("planBar");
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState("");

  const money = useUser((s) => s.profile.money);
  const plan = useUser((s) => s.plan);
  const setProfile = useUser((s) => s.setProfile);

  // الstore بيتقرا من localStorage بعد الhydration
  useEffect(() => setMounted(true), []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number(draft.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setProfile({ money: parsed });
    setDraft("");
  }

  if (!mounted) {
    return <div className="plan-bar" aria-hidden="true" />;
  }

  // لسه مدخلش حاجة → دعوة سطر واحد بخانة رقم جوه الشريط
  if (!money) {
    return (
      <div className="plan-bar">
        <form onSubmit={onSubmit} className="flex items-center gap-2 flex-wrap">
          <label htmlFor="plan-bar-money">{t("emptyPrompt")}</label>
          <input
            id="plan-bar-money"
            inputMode="decimal"
            dir="ltr"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="$"
            className="num w-28 rounded-sm border border-[var(--glass-border)] bg-[var(--field-bg)] px-2 py-1"
          />
          <button
            type="submit"
            className="rounded-sm border border-[var(--glass-border)] px-3 py-1"
          >
            {t("calculate")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="plan-bar">
      <span>💰 <Money value={money} /></span>

      {plan?.computable ? (
        <>
          <span className="plan-bar__sep">←→</span>
          <span>
            ⏳{" "}
            {t.rich("runway", {
              months: () => <CountUp value={plan.runwayMonths} decimals={1} />,
            })}
          </span>
        </>
      ) : (
        <>
          <span className="plan-bar__sep">←→</span>
          <Link href="/planner" className="underline underline-offset-4">
            {t("finishPlan")}
          </Link>
        </>
      )}
    </div>
  );
}
