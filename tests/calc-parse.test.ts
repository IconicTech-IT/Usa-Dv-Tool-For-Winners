import { describe, expect, it } from "vitest";

import { amountOrNull, formatNumber, parseAmount } from "@/lib/calc/parse-amount";

function value(input: string): number | null {
  const r = parseAmount(input);
  return r.ok ? r.value : null;
}

describe("parseAmount digits", () => {
  it("reads Latin, Arabic-Indic and Persian digits", () => {
    expect(value("123")).toBe(123);
    expect(value("١٢٣")).toBe(123);
    expect(value("۱۲۳")).toBe(123);
  });

  it("ignores spaces and non-breaking spaces", () => {
    expect(value(" 2 500 ")).toBe(2500);
    expect(value("2 500")).toBe(2500);
  });
});

describe("parseAmount separators", () => {
  it("treats a comma followed by three digits as thousands", () => {
    expect(value("1,500")).toBe(1500);
    expect(value("12,345,678")).toBe(12345678);
  });

  it("treats a short comma tail as a decimal comma", () => {
    expect(value("1,5")).toBe(1.5);
    expect(value("1,50")).toBe(1.5);
    expect(value("0,500")).toBe(0.5);
  });

  it("uses the last mark as the decimal when both appear", () => {
    expect(value("1,234.56")).toBe(1234.56);
    expect(value("1.234,56")).toBe(1234.56);
    expect(value("1,000.5")).toBe(1000.5);
  });

  it("treats several dots as thousands and a single dot as decimal", () => {
    expect(value("1.250.000")).toBe(1250000);
    expect(value("1.5")).toBe(1.5);
    expect(value(".5")).toBe(0.5);
    expect(value("5.")).toBe(5);
  });

  it("reads the Arabic decimal and thousand separators", () => {
    expect(value("١٬٢٠٠٫٥٠")).toBe(1200.5);
  });
});

describe("parseAmount failures", () => {
  it("reports empty input", () => {
    expect(parseAmount("")).toEqual({ ok: false, reason: "empty" });
    expect(parseAmount("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects text, mixed text and broken groups", () => {
    expect(parseAmount("abc")).toEqual({ ok: false, reason: "invalid" });
    expect(parseAmount("12abc")).toEqual({ ok: false, reason: "invalid" });
    expect(parseAmount("1,2,3")).toEqual({ ok: false, reason: "invalid" });
    expect(parseAmount("1..2")).toEqual({ ok: false, reason: "invalid" });
    expect(parseAmount(".")).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects negative numbers", () => {
    expect(parseAmount("-5")).toEqual({ ok: false, reason: "negative" });
  });

  it("amountOrNull gives null on any failure and zero is a valid amount", () => {
    expect(amountOrNull("x")).toBeNull();
    expect(amountOrNull("0")).toBe(0);
  });
});

describe("formatNumber", () => {
  it("uses Arabic-Indic digits for Arabic and Latin digits for English", () => {
    expect(/[٠-٩]/.test(formatNumber(1500, "ar"))).toBe(true);
    expect(formatNumber(1500, "en")).toBe("1,500");
  });
});
