import { describe, expect, it } from "vitest";

import { decimalToString } from "@/lib/calc/decimal";
import {
  ARAB_CURRENCY_CODES,
  listCurrencies,
  parseRate,
  rateLookupUrl,
  searchCurrencies,
} from "@/lib/calc/currency";

function rateText(raw: string): string | null {
  const rate = parseRate(raw);
  return rate === null ? null : decimalToString(rate);
}

describe("rate the user types", () => {
  it("parses a typed rate and rejects empty, zero and unreadable text", () => {
    expect(rateText("50")).toBe("50");
    expect(rateText("٤٩٫٥")).toBe("49.5");
    expect(rateText("")).toBeNull();
    expect(rateText("0")).toBeNull();
    expect(rateText("0,00")).toBeNull();
    expect(rateText("abc")).toBeNull();
  });
});

describe("currency picker", () => {
  const list = listCurrencies("ar");

  it("starts with the Arab currencies in the designed order", () => {
    const firstCodes = list.slice(0, ARAB_CURRENCY_CODES.length).map((o) => o.code);
    expect(firstCodes).toEqual([...ARAB_CURRENCY_CODES]);
    expect(list.slice(0, 3).every((o) => o.group === "arab")).toBe(true);
  });

  it("includes the rest of ISO 4217 after them", () => {
    const codes = list.map((o) => o.code);
    expect(codes).toContain("USD");
    expect(codes).toContain("EUR");
    expect(list.length).toBeGreaterThan(100);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("shows Arabic names for Arabic", () => {
    const egp = list.find((o) => o.code === "EGP");
    expect(egp?.name).toMatch(/جنيه/);
  });

  it("searches by code and by Arabic name, ignoring marks and alef forms", () => {
    expect(searchCurrencies(list, "sar").some((o) => o.code === "SAR")).toBe(true);
    expect(searchCurrencies(list, "ريال").some((o) => o.code === "SAR")).toBe(true);
    expect(searchCurrencies(list, "جُنيه").some((o) => o.code === "EGP")).toBe(true);
    expect(searchCurrencies(list, "")).toHaveLength(list.length);
  });
});

describe("rate lookup link", () => {
  it("opens Google for the chosen currency code", () => {
    expect(rateLookupUrl("EGP")).toBe("https://www.google.com/search?q=USD+to+EGP");
    expect(rateLookupUrl("SAR")).toBe("https://www.google.com/search?q=USD+to+SAR");
  });
});
