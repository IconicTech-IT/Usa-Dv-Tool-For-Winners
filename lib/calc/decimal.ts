/**
 * Exact decimal numbers for money maths (Engineering Library A-01, A-02, A-03).
 *
 * A typed amount is kept as whole digits plus a scale, never as a binary fraction:
 * value = units / 10^scale. All sizes are BigInt, so nothing can overflow or lose
 * precision. Rounding happens in one place only, `roundHalfUpDivide`.
 */

export interface Decimal {
  readonly units: bigint;
  readonly scale: number;
}

/** Longest whole part we accept (999 billion): beyond this the text is not a real amount. */
export const MAX_INTEGER_DIGITS = 12;

const TEN = 10n;
const DECIMAL_TEXT = /^[0-9]*\.?[0-9]*$/;

export function pow10(exponent: number): bigint {
  return TEN ** BigInt(exponent);
}

/** numerator / denominator, rounded half up. Both must be non-negative and the denominator positive. */
export function roundHalfUpDivide(numerator: bigint, denominator: bigint): bigint {
  return (2n * numerator + denominator) / (2n * denominator);
}

/** Reads "1234.56", "5." or ".5". Returns null for anything else or for a whole part that is too long. */
export function decimalFromString(text: string): Decimal | null {
  if (!DECIMAL_TEXT.test(text)) return null;
  const [integerPart = "", fractionPart = ""] = text.split(".");
  if (integerPart.replace(/^0+/, "").length > MAX_INTEGER_DIGITS) return null;
  if (integerPart === "" && fractionPart === "") return null;

  const fraction = fractionPart.replace(/0+$/, "");
  return { units: BigInt(`${integerPart}${fraction}` || "0"), scale: fraction.length };
}

export function decimalToString(value: Decimal): string {
  if (value.scale === 0) return value.units.toString();
  const divisor = pow10(value.scale);
  const fraction = (value.units % divisor).toString().padStart(value.scale, "0");
  return `${(value.units / divisor).toString()}.${fraction}`;
}

export function isZero(value: Decimal): boolean {
  return value.units === 0n;
}
