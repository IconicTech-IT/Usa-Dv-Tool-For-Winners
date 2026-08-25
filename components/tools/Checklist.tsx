"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { animate } from "animejs";
import { Card } from "@/components/Card";
import { localized } from "@/components/FieldValue";
import { useUser } from "@/lib/store/user-store";
import { useReducedMotion } from "@/lib/motion";
import type { Localized } from "@/lib/types";

export interface ChecklistItemView {
  id: string;
  title: Localized;
  detail: Localized;
  status: string;
  verifyNote?: string;
  /** البند ده بيظهر لمين */
  appliesTo?: string;
}

/**
 * الشيك ليست. التقدم بيتحفظ على الجهاز وبيظهر في /my-plan.
 * ختم البند هو أهم micro-interaction في الموقع — بيتختم زي ختم مستند.
 */
export function Checklist({
  listId,
  items,
}: {
  listId: string;
  items: ChecklistItemView[];
}) {
  const t = useTranslations("checklist");
  const tb = useTranslations("badges");
  const locale = useLocale() as "ar" | "en";
  const checks = useUser((s) => s.checklists[listId] ?? {});
  const toggle = useUser((s) => s.toggleCheck);
  const reduced = useReducedMotion();

  const done = items.filter((i) => checks[i.id]).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--slate)]">
        {t("progress", { done, total: items.length })}
      </p>

      <ul className="space-y-2">
        {items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            checked={Boolean(checks[item.id])}
            onToggle={() => toggle(listId, item.id)}
            locale={locale}
            reduced={reduced}
            needsVerificationLabel={tb("needsVerification")}
          />
        ))}
      </ul>
    </div>
  );
}

function ChecklistRow({
  item,
  checked,
  onToggle,
  locale,
  reduced,
  needsVerificationLabel,
}: {
  item: ChecklistItemView;
  checked: boolean;
  onToggle: () => void;
  locale: "ar" | "en";
  reduced: boolean;
  needsVerificationLabel: string;
}) {
  const stamp = useRef<HTMLSpanElement>(null);
  const wasChecked = useRef(checked);

  useEffect(() => {
    if (checked && !wasChecked.current && !reduced && stamp.current) {
      // ختم مستند: بيكبر وبيرتد وبيتظبط، مش checkmark عادي
      animate(stamp.current, {
        scale: [1.6, 0.92, 1],
        rotate: [-8, 0],
        duration: 400,
        ease: "outCubic",
      });
    }
    wasChecked.current = checked;
  }, [checked, reduced]);

  return (
    <Card as="li" dense status={checked ? "done" : "later"}>
      <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 shrink-0"
        />
        <span className="space-y-1">
          <span className="flex items-center gap-2 font-medium">
            {localized(item.title, locale)}
            {checked && (
              <span ref={stamp} className="inline-block text-[var(--seal)]">
                ✓
              </span>
            )}
            {item.status === "NEEDS_VERIFICATION" && (
              <span
                className="badge badge--needs-verification"
                title={item.verifyNote}
              >
                {needsVerificationLabel}
              </span>
            )}
          </span>
          <span className="block text-sm text-[var(--slate)]">
            {localized(item.detail, locale)}
          </span>
        </span>
      </label>
    </Card>
  );
}
