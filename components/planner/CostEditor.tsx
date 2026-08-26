"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/Card";
import { Money } from "@/components/Num";
import { localized } from "@/components/FieldValue";
import { useUser } from "@/lib/store/user-store";
import type { CostBreakdown } from "@/lib/planner/engine";
import type { CostKey } from "@/lib/planner/overrides";
import { COST_KEYS } from "@/lib/planner/overrides";

/**
 * المستخدم بيصحّح أرقامنا.
 *
 * ⚠️ المبدأ: **رقمه أصدق من رقمنا.** إحنا بنقول متوسط مدينة؛ هو لقى
 * غرفة بعينه بسعر معيّن. ولو شايف إنه هيستغنى عن بند كامل — أوضة عند
 * قريب، أو عربية مش هيشتريها، أو أثاث هيلاقيه ببلاش — ده قرار حقيقي
 * بيغيّر خطته فعلًا، والمهاجر الجديد بيقدر يستغني عن حاجات كتير في
 * أول فترة عشان يعدّي.
 *
 * وده كمان بيفك القفلة الكبيرة: بند مالوش رقم عندنا كان بيوقف الحسبة
 * تمامًا. دلوقتي المستخدم يقدر يفكها بنفسه.
 */
export function CostEditor({
  metroSlug,
  metroName,
  landing,
  burn,
  highlight,
}: {
  metroSlug: string;
  /** ⚠️ لازم يبان: الأرقام دي بتاعة مدينة معينة مش عامة */
  metroName?: string;
  landing: CostBreakdown[];
  burn: CostBreakdown[];
  /** البنود اللي غيابها بيوقف الحسبة — بتتعلّم عشان يبدأ منها */
  highlight?: string[];
}) {
  const t = useTranslations("costEditor");
  const overrides = useUser((s) => s.overrides);
  const clearOverrides = useUser((s) => s.clearOverrides);

  const edited = Object.values(overrides).reduce(
    (n, scope) => n + Object.keys(scope).length,
    0,
  );

  // بنشيل التكرار: البند اللي في الاتنين (الأكل مثلًا) يتعدّل مرة واحدة
  const seen = new Set<string>();
  const rows = [...landing, ...burn].filter((row) => {
    if (!isEditable(row.key)) return false;
    if (seen.has(row.key)) return false;
    seen.add(row.key);
    return true;
  });

  return (
    <Card status="now">
      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="font-bold">{t("title")}</h2>
          {metroName && (
            <p className="text-sm">{t("forCity", { city: metroName })}</p>
          )}
          <p className="text-sm text-[var(--slate)]">{t("lead")}</p>
        </div>

        <ul className="space-y-2">
          {rows.map((row) => (
            <CostRow
              key={row.key}
              row={row}
              metroSlug={metroSlug}
              needed={highlight?.includes(row.key) ?? false}
            />
          ))}
        </ul>

        {edited > 0 && (
          <button
            type="button"
            onClick={() => clearOverrides()}
            className="text-sm underline underline-offset-4"
          >
            {t("resetAll", { count: edited })}
          </button>
        )}
      </div>
    </Card>
  );
}

function isEditable(key: string): key is CostKey {
  return (COST_KEYS as readonly string[]).includes(key);
}

function CostRow({
  row,
  metroSlug,
  needed,
}: {
  row: CostBreakdown;
  metroSlug: string;
  needed: boolean;
}) {
  const t = useTranslations("costEditor");
  const locale = useLocale() as "ar" | "en";
  const setOverride = useUser((s) => s.setOverride);
  const key = row.key as CostKey;

  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(needed);

  const apply = () => {
    const n = Number(draft.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(n) || draft.trim() === "") return;
    setOverride(metroSlug, key, { mode: "custom", value: n });
    setDraft("");
  };

  return (
    <li
      className={`rounded-sm border p-3 space-y-2 ${
        needed && row.source === "missing"
          ? "border-[var(--signal)]"
          : "border-[var(--glass-border)]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{localized(row.label, locale)}</span>

        <span className="flex items-center gap-2 text-sm">
          {row.source === "missing" ? (
            <span className="badge badge--needs-verification">{t("weDontKnow")}</span>
          ) : row.source === "skipped" ? (
            <span className="badge badge--estimated">{t("skipped")}</span>
          ) : (
            <Money value={Math.round(row.amount)} />
          )}

          {row.source === "user" && (
            <span className="badge badge--estimated">{t("yours")}</span>
          )}
        </span>
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm underline underline-offset-4"
        >
          {row.source === "missing" ? t("iKnowIt") : t("change")}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            dir="ltr"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder={t("yourNumber")}
            aria-label={`${localized(row.label, locale)} — ${t("yourNumber")}`}
            className="num w-28 rounded-sm border border-[var(--glass-border)] bg-transparent px-2 py-1"
          />
          <button
            type="button"
            onClick={apply}
            className="rounded-sm border border-[var(--glass-border)] px-3 py-1 text-sm"
          >
            {t("save")}
          </button>

          <button
            type="button"
            onClick={() => setOverride(metroSlug, key, { mode: "skip" })}
            className="rounded-sm border border-[var(--glass-border)] px-3 py-1 text-sm"
          >
            {t("dontNeed")}
          </button>

          {row.source !== "site" && row.source !== "missing" && (
            <button
              type="button"
              onClick={() => setOverride(metroSlug, key, null)}
              className="text-sm underline underline-offset-4"
            >
              {t("useOurs")}
            </button>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm underline underline-offset-4 ms-auto"
          >
            {t("close")}
          </button>
        </div>
      )}
    </li>
  );
}
