"use client";

import { useTranslations } from "next-intl";

/** The "Includes: ..." line that says what a box covers, or undefined when the box needs none. */
export function useIncludes(id: string): string | undefined {
  const t = useTranslations("calc");
  const key = `itemIncludes.${id}`;
  return t.has(key) ? `${t("includesLabel")} ${t(key)}` : undefined;
}
