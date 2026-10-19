import { decimalFromString, type Decimal } from "@/lib/calc/decimal";

/**
 * Reads an amount the user typed. Accepts Arabic-Indic (٠-٩) and Persian (۰-۹)
 * digits, the Arabic decimal and thousand separators, spaces, and both "." and ","
 * as decimal or thousand marks.
 *
 * Rules for the ambiguous marks:
 * - both "," and "." present: the LAST one is the decimal mark, the other is thousands.
 * - only ",": several commas mean thousands; a single comma followed by exactly three
 *   digits (and 1-3 non-zero-leading digits before it) means thousands ("1,500");
 *   otherwise it is a decimal comma ("1,5", "0,500").
 * - only ".": several dots mean thousands ("1.250.000"); a single dot is decimal.
 */

export type ParseFailure = "empty" | "invalid" | "negative";

export type ParseResult = { ok: true; amount: Decimal } | { ok: false; reason: ParseFailure };

const ARABIC_INDIC_ZERO = 0x0660;
const PERSIAN_ZERO = 0x06f0;

function toAsciiDigits(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
      out += String(code - ARABIC_INDIC_ZERO);
    } else if (code >= PERSIAN_ZERO && code <= PERSIAN_ZERO + 9) {
      out += String(code - PERSIAN_ZERO);
    } else {
      out += ch;
    }
  }
  return out;
}

function normalizeSeparators(text: string): string {
  return text
    .replace(/٫/g, ".") // Arabic decimal separator
    .replace(/٬/g, ",") // Arabic thousands separator
    .replace(/[\s\u00A0\u202F'’]/g, "");
}

function resolveMarks(text: string): string | null {
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalMark = lastComma > lastDot ? "," : ".";
    const thousandsMark = decimalMark === "," ? "." : ",";
    return text.split(thousandsMark).join("").replace(decimalMark, ".");
  }

  if (lastComma >= 0) return resolveSingleMark(text, ",");
  if (lastDot >= 0) return resolveSingleMark(text, ".");
  return text;
}

function resolveRepeatedMark(parts: string[]): string | null {
  const [first, ...rest] = parts;
  const groupsOk = rest.every((group) => group.length === 3);
  if (!first || first.length > 3 || !groupsOk) return null;
  return parts.join("");
}

function looksLikeThousands(before: string, after: string): boolean {
  return after.length === 3 && before.length >= 1 && before.length <= 3 && !before.startsWith("0");
}

function resolveSingleMark(text: string, mark: "," | "."): string | null {
  const parts = text.split(mark);
  if (parts.length > 2) return resolveRepeatedMark(parts);

  const [before = "", after = ""] = parts;
  if (mark === "," && looksLikeThousands(before, after)) return before + after;
  return `${before}.${after}`;
}

function fail(reason: ParseFailure): ParseResult {
  return { ok: false, reason };
}

/** Reads what the user typed into an exact amount; zero counts as a valid amount. */
export function parseAmount(input: string): ParseResult {
  const trimmed = input.trim();
  if (trimmed === "") return fail("empty");

  const normalized = normalizeSeparators(toAsciiDigits(trimmed));
  if (normalized.startsWith("-")) return fail("negative");
  if (!/^[0-9.,]*[0-9][0-9.,]*$/.test(normalized)) return fail("invalid");

  const resolved = resolveMarks(normalized);
  const amount = resolved === null ? null : decimalFromString(resolved);
  return amount === null ? fail("invalid") : { ok: true, amount };
}

export type NumberLocale = "ar" | "en";

/** Formats for display: Arabic-Indic digits for Arabic, Latin digits for English. */
export function formatNumber(value: number, locale: NumberLocale, maximumFractionDigits = 2): string {
  const tag = locale === "ar" ? "ar-EG" : "en-US";
  return new Intl.NumberFormat(tag, { maximumFractionDigits }).format(value);
}
