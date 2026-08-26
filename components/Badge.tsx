"use client";

import { useLocale, useTranslations } from "next-intl";
import type { FieldDisplay } from "@/lib/content/field";

/**
 * ٣ بادچات بس في الموقع كله:
 *   estimated          → "تقديري" + الbasis في الtooltip
 *   NEEDS_VERIFICATION → "محتاج تأكيد" (ومفيش رقم أصلًا)
 *   verified / judgment → من غير بادج خالص
 *
 * ⚠️ judgment من غير بادج **بقصد**: البادج بيقول "الرقم ده فيه شك"،
 * وحقل judgment مفيهوش رقم أصلًا يتشك فيه — بيتعرض كوصف.
 */
export function Badge({ display }: { display: FieldDisplay }) {
  const t = useTranslations("badges");
  // ⚠️ كان `basis?.ar` ثابت — يعني اللي بيقرا الموقع بالإنجليزي كان بيلاقي
  // شرح التقدير بالعربي في الtooltip. الشرح لازم يوصل بلغة القارئ.
  const locale = useLocale() as "ar" | "en";

  if (display.kind === "missing") {
    return (
      <span className="badge badge--needs-verification" title={display.note}>
        {t("needsVerification")}
      </span>
    );
  }

  if (display.badge === "estimated") {
    return (
      <span className="badge badge--estimated" title={display.basis ? display.basis[locale] || display.basis.ar : undefined}>
        {t("estimated")}
      </span>
    );
  }

  return null;
}
