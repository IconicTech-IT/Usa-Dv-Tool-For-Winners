import type { FieldCurrency, Rate } from "@/lib/calc/currency";
import { pow10, roundHalfUpDivide, type Decimal } from "@/lib/calc/decimal";
import type { NumberLocale } from "@/lib/calc/parse-amount";

/**
 * Money is a BigInt count of US cents. Every conversion is exact integer maths with one
 * rounding rule (half up), so 0.1 + 0.2 is exactly 0.30 and totals never drift.
 */

export type Cents = bigint;

export const ZERO_CENTS: Cents = 0n;

const CENTS_PER_UNIT = 100n;
const FRACTION_DIGITS = 2;

/** A typed amount in US dollars, as cents. */
export function amountToCents(amount: Decimal): Cents {
  return roundHalfUpDivide(amount.units * CENTS_PER_UNIT, pow10(amount.scale));
}

/**
 * A typed amount to US cents. A local-currency amount needs the rate the user typed
 * (local units per one dollar); without it the result is null.
 */
export function toUsdCents(amount: Decimal, currency: FieldCurrency, rate: Rate | null): Cents | null {
  if (currency === "usd") return amountToCents(amount);
  if (rate === null) return null;

  // cents = amount / rate x 100, kept as one exact fraction
  const numerator = amount.units * pow10(rate.scale) * CENTS_PER_UNIT;
  const denominator = pow10(amount.scale) * rate.units;
  return roundHalfUpDivide(numerator, denominator);
}

/** US cents shown in the local currency at the user's rate (local hundredths); null without a rate. */
export function usdCentsToLocalCents(usdCents: Cents, rate: Rate | null): Cents | null {
  if (rate === null) return null;
  const sign = usdCents < ZERO_CENTS ? -1n : 1n;
  const magnitude = usdCents * sign;
  return sign * roundHalfUpDivide(magnitude * rate.units, pow10(rate.scale));
}

/** Cents times a typed decimal factor (for example a number of months), rounded half up. */
export function multiplyCents(cents: Cents, factor: Decimal): Cents {
  const sign = cents < ZERO_CENTS ? -1n : 1n;
  return sign * roundHalfUpDivide(cents * sign * factor.units, pow10(factor.scale));
}

/**
 * For display only: the number never feeds back into any calculation. Whole units fit a
 * safe integer because typed amounts are limited to 12 integer digits.
 */
export function formatMoney(cents: Cents, locale: NumberLocale): string {
  const whole = cents / CENTS_PER_UNIT;
  const hundredths = cents % CENTS_PER_UNIT;
  const value = Number(whole) + Number(hundredths) / Number(CENTS_PER_UNIT);
  const tag = locale === "ar" ? "ar-EG" : "en-US";
  return new Intl.NumberFormat(tag, { maximumFractionDigits: FRACTION_DIGITS }).format(value);
}
