import { amountOrNull } from "@/lib/calc/parse-amount";

/**
 * Currency maths. We never supply an exchange rate: the user types
 * how many local units equal one US dollar, and every conversion uses that number.
 */

export type FieldCurrency = "usd" | "local";

/** The rate the user typed (local units per one US dollar), or null if empty or not positive. */
export function parseRate(raw: string): number | null {
  const value = amountOrNull(raw);
  return value !== null && value > 0 ? value : null;
}

/**
 * Converts an amount typed in a field to US dollars.
 * Returns null when the field is in the local currency and no valid rate was typed.
 */
export function toUsd(amount: number, currency: FieldCurrency, rate: number | null): number | null {
  if (currency === "usd") return amount;
  if (rate === null) return null;
  return amount / rate;
}

/** US dollars to the local currency at the user's rate; null without a rate. */
export function usdToLocal(usd: number, rate: number | null): number | null {
  return rate === null ? null : usd * rate;
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
