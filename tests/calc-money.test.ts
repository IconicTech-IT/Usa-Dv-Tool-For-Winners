import { describe, expect, it } from "vitest";

import { parseRate } from "@/lib/calc/currency";
import { roundHalfUpDivide, type Decimal } from "@/lib/calc/decimal";
import {
  amountToCents,
  formatMoney,
  multiplyCents,
  toUsdCents,
  usdCentsToLocalCents,
} from "@/lib/calc/money";
import { parseAmount } from "@/lib/calc/parse-amount";

function amount(text: string): Decimal {
  const parsed = parseAmount(text);
  if (!parsed.ok) throw new Error(`test input is not an amount: ${text}`);
  return parsed.amount;
}

function rate(text: string) {
  const parsed = parseRate(text);
  if (parsed === null) throw new Error(`test input is not a rate: ${text}`);
  return parsed;
}

describe("rounding half up (the one rounding rule)", () => {
  it("rounds .5 up and below .5 down", () => {
    expect(roundHalfUpDivide(5n, 10n)).toBe(1n);
    expect(roundHalfUpDivide(4n, 10n)).toBe(0n);
    expect(roundHalfUpDivide(15n, 10n)).toBe(2n);
    expect(roundHalfUpDivide(0n, 7n)).toBe(0n);
  });
});

describe("dollars to cents", () => {
  it("has no binary drift: 0.1 + 0.2 is exactly 30 cents", () => {
    expect(amountToCents(amount("0.1")) + amountToCents(amount("0.2"))).toBe(30n);
  });

  it("rounds a third decimal digit half up", () => {
    expect(amountToCents(amount("1.005"))).toBe(101n);
    expect(amountToCents(amount("1.004"))).toBe(100n);
    expect(amountToCents(amount("0.005"))).toBe(1n);
    expect(amountToCents(amount("0.004"))).toBe(0n);
  });

  it("handles zero and the largest accepted amount", () => {
    expect(amountToCents(amount("0"))).toBe(0n);
    expect(amountToCents(amount("999999999999.99"))).toBe(99999999999999n);
  });
});

describe("local currency to US cents with the typed rate", () => {
  it("leaves dollars alone and needs a rate for local amounts", () => {
    expect(toUsdCents(amount("100"), "usd", null)).toBe(10000n);
    expect(toUsdCents(amount("100"), "local", null)).toBeNull();
  });

  it("divides by the rate exactly and rounds once", () => {
    expect(toUsdCents(amount("1000"), "local", rate("50"))).toBe(2000n);
    expect(toUsdCents(amount("100"), "local", rate("3"))).toBe(3333n);
    expect(toUsdCents(amount("1"), "local", rate("3"))).toBe(33n);
    expect(toUsdCents(amount("2"), "local", rate("3"))).toBe(67n);
  });

  it("works with a rate that has decimals", () => {
    expect(toUsdCents(amount("495"), "local", rate("49.5"))).toBe(1000n);
    expect(toUsdCents(amount("1"), "local", rate("0.3"))).toBe(333n);
  });
});

describe("US cents to the local currency", () => {
  it("multiplies by the rate, or gives nothing without one", () => {
    expect(usdCentsToLocalCents(200n, rate("50"))).toBe(10000n);
    expect(usdCentsToLocalCents(200n, null)).toBeNull();
  });

  it("handles a negative amount by mirroring the positive one", () => {
    expect(usdCentsToLocalCents(-200n, rate("50"))).toBe(-10000n);
    expect(usdCentsToLocalCents(-1n, rate("0.5"))).toBe(-1n);
  });
});

describe("months as a decimal factor", () => {
  it("multiplies cents by whole and fractional months", () => {
    expect(multiplyCents(100000n, amount("2"))).toBe(200000n);
    expect(multiplyCents(100000n, amount("1.5"))).toBe(150000n);
    expect(multiplyCents(-100000n, amount("1.5"))).toBe(-150000n);
  });
});

describe("display", () => {
  it("formats with Arabic-Indic digits for Arabic and Latin digits for English", () => {
    expect(formatMoney(123456n, "en")).toBe("1,234.56");
    expect(/[٠-٩]/.test(formatMoney(123456n, "ar"))).toBe(true);
  });

  it("drops the cents when they are zero and keeps the sign", () => {
    expect(formatMoney(150000n, "en")).toBe("1,500");
    expect(formatMoney(-250n, "en")).toBe("-2.5");
  });
});
