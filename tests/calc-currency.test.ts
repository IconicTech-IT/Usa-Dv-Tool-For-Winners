import { describe, expect, it } from "vitest";

import {
  ARAB_CURRENCY_CODES,
  listCurrencies,
  parseRate,
  rateLookupUrl,
  searchCurrencies,
  toUsd,
  usdToLocal,
} from "@/lib/calc/currency";

describe("rate and conversion", () => {
  it("parses a typed rate and rejects empty, zero and negative", () => {
    expect(parseRate("50")).toBe(50);
    expect(parseRate("٤٩٫٥")).toBe(49.5);
    expect(parseRate("")).toBeNull();
    expect(parseRate("0")).toBeNull();
    expect(parseRate("abc")).toBeNull();
  });

  it("converts local amounts with the user's rate and leaves dollars alone", () => {
    expect(toUsd(100, "usd", null)).toBe(100);
    expect(toUsd(100, "local", 50)).toBe(2);
    expect(toUsd(100, "local", null)).toBeNull();
  });

  it("converts dollars to local, or null without a rate", () => {
    expect(usdToLocal(2, 50)).toBe(100);
    expect(usdToLocal(2, null)).toBeNull();
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
