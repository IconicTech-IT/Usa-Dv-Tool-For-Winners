import type { Decimal } from "@/lib/calc/decimal";
import { parseAmount } from "@/lib/calc/parse-amount";

/**
 * Currency maths. We never supply an exchange rate: the user types
 * how many local units equal one US dollar, and every conversion uses that number.
 */

export type FieldCurrency = "usd" | "local";

/** Local units per one US dollar, exactly as typed. */
export type Rate = Decimal;

/** The rate the user typed, or null if it is empty, unreadable, or not above zero. */
export function parseRate(raw: string): Rate | null {
  const parsed = parseAmount(raw);
  return parsed.ok && parsed.amount.units > 0n ? parsed.amount : null;
}

/* ------------------------------------------------------------------ */
/* Currency picker                                                     */
/* ------------------------------------------------------------------ */

export const DEFAULT_LOCAL_CURRENCY = "EGP";

/** Common Arab currencies first, in this order (design note s2). */
export const ARAB_CURRENCY_CODES = [
  "EGP",
  "MAD",
  "DZD",
  "TND",
  "SAR",
  "AED",
  "JOD",
  "IQD",
  "SYP",
  "LBP",
  "SDG",
  "YER",
  "KWD",
  "QAR",
  "OMR",
  "BHD",
  "LYD",
] as const;

export interface CurrencyOption {
  code: string;
  /** Name in the requested locale (Arabic names for "ar"). */
  name: string;
  group: "arab" | "all";
}

function displayName(code: string, locale: "ar" | "en"): string {
  try {
    const names = new Intl.DisplayNames([locale], { type: "currency" });
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

function supportedCodes(): string[] {
  try {
    return Intl.supportedValuesOf("currency");
  } catch {
    return [...ARAB_CURRENCY_CODES, "USD", "EUR", "GBP"];
  }
}

/** Full ISO 4217 list: Arab currencies first (group "arab"), then everything else sorted by code. */
export function listCurrencies(locale: "ar" | "en"): CurrencyOption[] {
  const all = supportedCodes();
  const arabSet = new Set<string>(ARAB_CURRENCY_CODES);
  const arab = ARAB_CURRENCY_CODES.filter((c) => all.includes(c) || c === "EGP").map(
    (code): CurrencyOption => ({ code, name: displayName(code, locale), group: "arab" }),
  );
  const rest = all
    .filter((c) => !arabSet.has(c))
    .sort()
    .map((code): CurrencyOption => ({ code, name: displayName(code, locale), group: "all" }));
  return [...arab, ...rest];
}

/** Lower-cases and removes Arabic marks so "جنيه" and "جُنيه" or "إ/أ/ا" match. */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "") // harakat and tatweel
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

/** Filters the picker by code or name; an empty query returns the full list. */
export function searchCurrencies(options: CurrencyOption[], query: string): CurrencyOption[] {
  const q = normalizeSearchText(query);
  if (q === "") return options;
  return options.filter(
    (o) => normalizeSearchText(o.code).includes(q) || normalizeSearchText(o.name).includes(q),
  );
}

export function isValidCurrencyCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

/** The Google link that opens the live USD rate for the chosen currency. */
export function rateLookupUrl(localCode: string): string {
  return `https://www.google.com/search?q=USD+to+${encodeURIComponent(localCode)}`;
}
