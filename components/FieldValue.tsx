"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Field, Localized } from "@/lib/types";
import { display } from "@/lib/content/field";
import { Num } from "./Num";

/**
 * الطريقة الوحيدة لعرض أي حقل محتوى في الواجهة.
 *
 * ⚠️ حقل `judgment` بيطلع منها **وصف مش رقم** — لأن `display()` مبترجعش
 * رقم للحالة دي أصلًا. متعملش عرض يدوي لأي حقل، عدّي من هنا.
 */
export function FieldValue({
  field,
  unit,
  prefix,
}: {
  field: Field<number | string | boolean>;
  unit?: string;
  /** بيتحط قبل الرقم — للعملة. الرقم من غيره بيتقرا كعدد مش كفلوس. */
  prefix?: string;
}) {
  const t = useTranslations("badges");
  const locale = useLocale() as "ar" | "en";
  const d = display(field);

  if (d.kind === "missing") {
    return (
      <span className="badge badge--needs-verification" title={d.note}>
        {t("needsVerification")}
      </span>
    );
  }

  const badge =
    d.badge === "estimated" ? (
      <span
        className="badge badge--estimated"
        title={d.basis ? d.basis[locale] || d.basis.ar : undefined}
      >
        {t("estimated")}
      </span>
    ) : null;

  if (d.kind === "number") {
    return (
      <span className="inline-flex items-center gap-2">
        <Num>
          {prefix ?? ""}
          {d.value.toLocaleString("en-US")}
          {unit ?? ""}
        </Num>
        {badge}
      </span>
    );
  }

  const text = typeof d.text === "string" ? d.text : localized(d.text, locale);
  return (
    <span className="inline-flex items-center gap-2">
      <span>{text}</span>
      {badge}
    </span>
  );
}

export function localized(v: Localized, locale: "ar" | "en"): string {
  return v[locale]?.trim() ? v[locale] : v.ar;
}

/** فلوس + بادج الحالة. للأرقام اللي بتتعرض في الخطة والحاسبات. */
export function MoneyField({ field }: { field: Field<number> }) {
  const t = useTranslations("badges");
  const locale = useLocale() as "ar" | "en";
  const d = display(field);

  if (d.kind !== "number") {
    return (
      <span className="badge badge--needs-verification">
        {t("needsVerification")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Num>${d.value.toLocaleString("en-US")}</Num>
      {d.badge === "estimated" && (
        <span
          className="badge badge--estimated"
          title={d.basis ? d.basis[locale] || d.basis.ar : undefined}
        >
          {t("estimated")}
        </span>
      )}
    </span>
  );
}
