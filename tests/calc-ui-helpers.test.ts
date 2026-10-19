import { describe, expect, it } from "vitest";

import { isInvalidAmountText } from "@/lib/calc/parse-amount";
import { bufferMonthsOf, MAX_BUFFER_MONTHS } from "@/lib/calc/plan-actions";

describe("isInvalidAmountText", () => {
  it("does not call empty text invalid: nothing was typed", () => {
    expect(isInvalidAmountText("")).toBe(false);
    expect(isInvalidAmountText("   ")).toBe(false);
  });

  it("accepts numbers in Latin and Arabic-Indic digits", () => {
    expect(isInvalidAmountText("1250")).toBe(false);
    expect(isInvalidAmountText("١٬٢٥٠")).toBe(false);
    expect(isInvalidAmountText("12.5")).toBe(false);
  });

  it("flags letters and negative numbers", () => {
    expect(isInvalidAmountText("12a")).toBe(true);
    expect(isInvalidAmountText("-5")).toBe(true);
  });
});

describe("bufferMonthsOf", () => {
  it("reads a whole number of months", () => {
    expect(bufferMonthsOf("3")).toBe(3);
    expect(bufferMonthsOf(" 12 ")).toBe(12);
  });

  it("is zero for empty or unreadable text", () => {
    expect(bufferMonthsOf("")).toBe(0);
    expect(bufferMonthsOf("two")).toBe(0);
    expect(bufferMonthsOf("2.5")).toBe(0);
    expect(bufferMonthsOf("-1")).toBe(0);
  });

  it("never goes above the limit of the stepper", () => {
    expect(bufferMonthsOf("99")).toBe(MAX_BUFFER_MONTHS);
  });
});
