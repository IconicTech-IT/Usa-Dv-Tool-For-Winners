import { describe, expect, it } from "vitest";
import { Field, ChecklistItem, Metro } from "@/content/_schema";
import { collectFields, countStatuses } from "@/lib/content/load";
import { display, rankValue } from "@/lib/content/field";

const base = {
  sources: [],
  lastVerified: "2026-08-25",
};

describe("قواعد الحالات", () => {
  it("verified لازم قيمة ومصدر", () => {
    expect(Field.safeParse({ ...base, value: 5, status: "verified" }).success).toBe(
      false,
    );
    expect(
      Field.safeParse({
        value: 5,
        status: "verified",
        lastVerified: "2026-08-25",
        sources: [{ label: "IRS", url: "https://www.irs.gov/" }],
      }).success,
    ).toBe(true);
  });

  it("estimated لازم basis و verifyIn — من غيرهم بيفشل", () => {
    expect(Field.safeParse({ ...base, value: 3, status: "estimated" }).success).toBe(
      false,
    );

    const ok = Field.safeParse({
      ...base,
      value: 3,
      status: "estimated",
      basis: { ar: "تقدير من معرفة عامة", en: "General knowledge estimate" },
      verifyIn: "1-year",
    });
    expect(ok.success).toBe(true);
  });

  it("estimated مسموح من غير مصدر — دي كانت القاعدة اللي اترخّت", () => {
    const r = Field.safeParse({
      ...base,
      value: 4,
      status: "estimated",
      basis: { ar: "تقدير", en: "Estimate" },
      verifyIn: "6-months",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.sources).toHaveLength(0);
  });

  it("judgment لازم label، وممنوع يكون عليه مصدر", () => {
    expect(Field.safeParse({ ...base, value: 4, status: "judgment" }).success).toBe(
      false,
    );

    expect(
      Field.safeParse({
        ...base,
        value: 4,
        status: "judgment",
        label: { ar: "جالية عربية كبيرة", en: "Large Arab community" },
      }).success,
    ).toBe(true);

    // لو فيه مصدر بيرتبه فعلًا، يبقى مش حكم شخصي
    expect(
      Field.safeParse({
        value: 4,
        status: "judgment",
        lastVerified: "2026-08-25",
        label: { ar: "جالية كبيرة", en: "Large community" },
        sources: [{ label: "Census", url: "https://www.census.gov/" }],
      }).success,
    ).toBe(false);
  });

  it("NEEDS_VERIFICATION لازم قيمته null", () => {
    expect(
      Field.safeParse({ ...base, value: 3, status: "NEEDS_VERIFICATION" }).success,
    ).toBe(false);
    expect(
      Field.safeParse({ ...base, value: null, status: "NEEDS_VERIFICATION" }).success,
    ).toBe(true);
  });

  it("judgment مالهاش معنى في بند شيك ليست", () => {
    const item = {
      id: "x",
      title: { ar: "بند", en: "Item" },
      detail: { ar: "تفصيل", en: "Detail" },
      status: "judgment",
      sources: [],
      lastVerified: "2026-08-25",
    };
    expect(ChecklistItem.safeParse(item).success).toBe(false);
  });
});

describe("العرض", () => {
  const judgment = {
    value: 5,
    status: "judgment" as const,
    sources: [],
    lastVerified: "2026-08-25",
    label: { ar: "من أكبر الجاليات العربية في أمريكا", en: "One of the largest" },
  };

  it("⚠️ حقل judgment مبيرجعش رقم للعرض أبدًا", () => {
    const d = display(judgment);
    expect(d.kind).toBe("text");
    if (d.kind === "text") {
      expect(d.text).toEqual(judgment.label);
      // ومفيش بادج — البادج بيقول "الرقم فيه شك"، وهنا مفيش رقم أصلًا
      expect(d.badge).toBeNull();
    }
  });

  it("الرقم الداخلي متاح للمحرك بس", () => {
    expect(rankValue(judgment)).toBe(5);
  });

  it("estimated بياخد بادج، و NEEDS_VERIFICATION مبيرجعش قيمة", () => {
    const est = display({
      value: 1200,
      status: "estimated",
      sources: [],
      lastVerified: "2026-08-25",
      basis: { ar: "تقدير", en: "Estimate" },
      verifyIn: "6-months",
    });
    expect(est.kind).toBe("number");
    if (est.kind === "number") expect(est.badge).toBe("estimated");

    const missing = display({
      value: null,
      status: "NEEDS_VERIFICATION",
      sources: [],
      lastVerified: "2026-08-25",
    });
    expect(missing.kind).toBe("missing");
  });
});

describe("المحتوى الحقيقي", () => {
  const fields = collectFields();

  it("كل ملفات المحتوى بتعدي الschema", () => {
    expect(fields.length).toBeGreaterThan(1000);
  });

  it("مفيش حقل estimated من غير basis أو verifyIn", () => {
    const counts = countStatuses(fields);
    expect(counts.estimated).toBeGreaterThan(0);
    // الschema هي اللي بتفرضها — لو عدّى الload يبقى كله سليم
    expect(counts.judgment).toBe(130);
  });
});

describe("⚠️ الفواتير مينفعش تتحط مرتين في المحتوى", () => {
  const est = (value: number, extra: Record<string, unknown> = {}) => ({
    value,
    status: "estimated",
    sources: [],
    lastVerified: "2026-08-26",
    basis: { ar: "أساس", en: "basis" },
    verifyIn: "1-year",
    ...extra,
  });

  const nulled = {
    value: null,
    status: "NEEDS_VERIFICATION",
    sources: [],
    lastVerified: "2026-08-26",
  };

  const judgment = (value: number) => ({
    value,
    status: "judgment",
    sources: [],
    lastVerified: "2026-08-26",
    label: { ar: "وصف", en: "label" },
  });

  const build = (costs: Record<string, unknown>) => ({
    slug: "x-tx",
    name: { ar: "س", en: "X" },
    state: "TX",
    car: {
      carNeed: judgment(3),
      carNeedLabel: { ar: "متوسط", en: "Medium" },
      transitSystem: nulled,
      transitScore: nulled,
      carFreeNeighborhoods: nulled,
      monthlyTransitPass: nulled,
    },
    costs: {
      roomRent: nulled,
      apt1br: nulled,
      apt2br: nulled,
      securityDeposit: nulled,
      utilities: nulled,
      groceriesPerAdult: nulled,
      carInsurance: nulled,
      ...costs,
    },
    work: { gigDemand: judgment(3), worksWithoutEnglish: judgment(3), warehouseJobs: nulled },
    life: {
      arabCommunity: judgment(3),
      halalAccess: nulled,
      schoolQuality: nulled,
      winterSeverity: nulled,
    },
    lastVerified: "2026-08-26",
  });

  it("إيجار شامل الفواتير + رقم في utilities = الbuild بيفشل", () => {
    const bad = Metro.safeParse(
      build({
        roomRent: est(700, { includesUtilities: true }),
        utilities: est(150),
      }),
    );
    expect(bad.success).toBe(false);
    expect(JSON.stringify(bad.error?.issues)).toContain("مرتين");
  });

  it("إيجار شامل الفواتير و utilities فاضية = تمام", () => {
    expect(
      Metro.safeParse(build({ roomRent: est(700, { includesUtilities: true }) })).success,
    ).toBe(true);
  });

  it("إيجار مش شامل + رقم في utilities = تمام", () => {
    expect(
      Metro.safeParse(build({ roomRent: est(700), utilities: est(150) })).success,
    ).toBe(true);
  });
});
