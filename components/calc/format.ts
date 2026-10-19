import { useLocale } from "next-intl";

import type { NumberLocale } from "@/lib/calc/parse-amount";

/** The number style of the page language ("ar" shows Arabic-Indic digits). */
export function useNumberLocale(): NumberLocale {
  return useLocale() === "ar" ? "ar" : "en";
}

/** Shown in place of an amount nobody typed yet. */
export const NO_AMOUNT = "—";
