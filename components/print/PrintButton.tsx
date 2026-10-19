"use client";

import { useTranslations } from "next-intl";

import { Icon } from "@/components/Icon";

/** Opens the browser's own print window, where "Save as PDF" is one of the choices. Nothing is sent anywhere. */
export function PrintButton() {
  const t = useTranslations("print");
  return (
    <button type="button" className="btn pr no-print" onClick={() => window.print()}>
      <Icon name="print" />
      {t("button")}
    </button>
  );
}
