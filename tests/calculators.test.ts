import { describe, expect, it } from "vitest";
import {
  applyBrackets,
  healthSubsidy,
  takeHome,
  type Bracket,
  type TaxTables,
} from "@/lib/calculators/tax";
import {
  breakEvenMonths,
  carMonthlyCost,
  gigEarnings,
  loanPayment,
} from "@/lib/calculators/gig";
import type { Field } from "@/lib/types";

const src = [{ label: "test", url: "https://example.com/" }];
const v = <T>(value: T): Field<T> => ({
  value,
  status: "verified",
  sources: src,
  lastVerified: "2026-08-25",
});
const missing = <T>(): Field<T> => ({
  value: null,
  status: "NEEDS_VERIFICATION",
  sources: [],
  lastVerified: "2026-08-25",
});

// أرقام اختبار مخترعة بالكامل — دي مش أرقام IRS حقيقية،
// الغرض منها اختبار المعادلة مش تمثيل الواقع.
const brackets: Bracket[] = [
  { upTo: 10_000, rate: 0.1 },
  { upTo: 40_000, rate: 0.2 },
  { upTo: null, rate: 0.3 },
];

const tables: TaxTables = {
  taxYear: v(new Date().getFullYear()),
  federalBrackets: { single: v(brackets), married: v(brackets), headOfHousehold: v(brackets) },
  standardDeduction: { single: v(10_000), married: v(20_000), headOfHousehold: v(15_000) },
  socialSecurityRate: v(0.062),
  socialSecurityWageCap: v(160_000),
  medicareRate: v(0.0145),
  childTaxCredit: v(2000),
  irsMileageRate: v(0.67),
  selfEmploymentRate: v(0.153),
  federalPovertyLine: { base: v(15_000), perPerson: v(5000) },
};

describe("الشرايح التصاعدية", () => {
  it("بتتطبق شريحة شريحة مش نسبة واحدة على الكل", () => {
    // 10k عند 10% + 10k عند 20% = 1000 + 2000
    expect(applyBrackets(20_000, brackets)).toBe(3000);
  });

  it("الشريحة الأخيرة مفتوحة", () => {
    // 1000 + 6000 + 30% على 60k = 1000+6000+18000
    expect(applyBrackets(100_000, brackets)).toBe(25_000);
  });

  it("دخل صفر = ضريبة صفر", () => {
    expect(applyBrackets(0, brackets)).toBe(0);
  });

  it("⚠️ نسبة ثابتة وشرايح بيدوا نتايج مختلفة — دي الغلطة القديمة", () => {
    const flat = 100_000 * 0.3;
    expect(applyBrackets(100_000, brackets)).toBeLessThan(flat);
  });
});

describe("صافي المرتب", () => {
  it("بيحسب الصافي والنسبة الفعلية", () => {
    const r = takeHome(
      {
        annualSalary: 60_000,
        filingStatus: "single",
        dependents: 0,
        stateTax: 0.05,
        localTaxRate: null,
        householdSize: 1,
      },
      tables,
    );
    expect(r.netAnnual).toBeLessThan(r.gross);
    expect(r.netMonthly).toBeCloseTo(r.netAnnual / 12);
    expect(r.effectiveRate).toBeGreaterThan(0);
    expect(r.missingFields).toHaveLength(0);
  });

  it("⚠️ ضريبة المدينة بتفرق فعلًا — الحاجة اللي الكل بينساها", () => {
    const base = { annualSalary: 60_000, filingStatus: "single" as const, dependents: 0, stateTax: 0.05, householdSize: 1 };
    const without = takeHome({ ...base, localTaxRate: null }, tables);
    const withCity = takeHome({ ...base, localTaxRate: 0.038 }, tables);
    expect(withCity.netAnnual).toBeLessThan(without.netAnnual);
    expect(without.netAnnual - withCity.netAnnual).toBeCloseTo(60_000 * 0.038);
  });

  it("بيدعم النسبة الثابتة والشرايح التصاعدية للولاية", () => {
    const flat = takeHome(
      { annualSalary: 100_000, filingStatus: "single", dependents: 0, stateTax: 0.05, localTaxRate: null, householdSize: 1 },
      tables,
    );
    const progressive = takeHome(
      { annualSalary: 100_000, filingStatus: "single", dependents: 0, stateTax: brackets, localTaxRate: null, householdSize: 1 },
      tables,
    );
    expect(flat.netAnnual).not.toBe(progressive.netAnnual);
    expect(flat.missingFields).toHaveLength(0);
    expect(progressive.missingFields).toHaveLength(0);
  });

  it("سقف الضمان الاجتماعي بيتطبق", () => {
    const r = takeHome(
      { annualSalary: 500_000, filingStatus: "single", dependents: 0, stateTax: 0, localTaxRate: null, householdSize: 1 },
      tables,
    );
    const ss = r.lines.find((l) => l.key === "socialSecurity")!;
    expect(ss.amount).toBeCloseTo(160_000 * 0.062);
  });

  it("إعفاء الأطفال بيقلل الفيدرالية ومبيوصلهاش تحت الصفر", () => {
    const many = takeHome(
      { annualSalary: 20_000, filingStatus: "single", dependents: 8, stateTax: 0, localTaxRate: null, householdSize: 9 },
      tables,
    );
    expect(many.lines.find((l) => l.key === "federal")!.amount).toBe(0);
  });

  it("⚠️ رقم ضريبي ناقص بيتسجل مبيتفرضش صفر بالسكوت", () => {
    const broken: TaxTables = { ...tables, socialSecurityRate: missing<number>() };
    const r = takeHome(
      { annualSalary: 60_000, filingStatus: "single", dependents: 0, stateTax: 0.05, localTaxRate: null, householdSize: 1 },
      broken,
    );
    expect(r.missingFields).toContain("socialSecurityRate");
    expect(r.lines.find((l) => l.key === "socialSecurity")!.missing).toBe(true);
  });

  it("⚠️ سنة ضرايب قديمة بتترصد", () => {
    const old: TaxTables = { ...tables, taxYear: v(2024) };
    const r = takeHome(
      { annualSalary: 50_000, filingStatus: "single", dependents: 0, stateTax: 0, localTaxRate: null, householdSize: 1 },
      old,
    );
    expect(r.staleTaxYear).toBe(2024);
  });
});

describe("دعم التأمين الصحي", () => {
  it("بيحسب النسبة من خط الفقر حسب حجم الأسرة", () => {
    const r = healthSubsidy(30_000, 3, tables);
    // 15000 + 5000*2 = 25000
    expect(r.percentOfPovertyLine).toBeCloseTo(30_000 / 25_000);
  });

  it("خط الفقر ناقص = مبيخمّنش", () => {
    const broken: TaxTables = {
      ...tables,
      federalPovertyLine: { base: missing<number>(), perPerson: v(5000) },
    };
    const r = healthSubsidy(30_000, 1, broken);
    expect(r.percentOfPovertyLine).toBeNull();
    expect(r.likelyMedicaidEligible).toBeNull();
  });
});

describe("العربية", () => {
  it("قسط القرض بيزيد مع الAPR", () => {
    const cheap = loanPayment(10_000, 0.05, 48);
    const immigrant = loanPayment(10_000, 0.135, 48);
    expect(immigrant).toBeGreaterThan(cheap);
  });

  it("APR صفر = تقسيم بسيط", () => {
    expect(loanPayment(12_000, 0, 12)).toBe(1000);
  });

  it("كاش (مفيش تمويل) = مفيش قسط", () => {
    const c = carMonthlyCost({
      price: 6000,
      downPayment: 6000,
      apr: 0.135,
      loanMonths: 48,
      monthlyMiles: 1000,
      mpg: 25,
      fuelPricePerGallon: 3.5,
      monthlyInsurance: 200,
      annualRegistration: 120,
      maintenancePerMile: 0.08,
      rideshareInsuranceAddOn: 0,
    });
    expect(c.loanPayment).toBe(0);
    expect(c.total).toBeGreaterThan(0);
    expect(c.missingFields).toHaveLength(0);
  });

  it("رقم ناقص في تكلفة العربية بيتسجل", () => {
    const c = carMonthlyCost({
      price: 6000,
      downPayment: 1000,
      apr: 0.135,
      loanMonths: 48,
      monthlyMiles: 1000,
      mpg: 25,
      fuelPricePerGallon: null,
      monthlyInsurance: null,
      annualRegistration: null,
      maintenancePerMile: null,
      rideshareInsuranceAddOn: 0,
    });
    expect(c.missingFields).toEqual(
      expect.arrayContaining(["carInsurance", "fuelPrice", "maintenancePerMile", "registration"]),
    );
  });

  it("نقطة التعادل بترجع null لو الشرا مش بيوفر", () => {
    expect(breakEvenMonths(900, 700, 2000)).toBeNull();
    expect(breakEvenMonths(500, 700, 2000)).toBe(10);
  });
});

describe("⚠️ الأجر الحقيقي في الساعة", () => {
  const car = carMonthlyCost({
    price: 8000,
    downPayment: 2000,
    apr: 0.135,
    loanMonths: 48,
    monthlyMiles: 2000,
    mpg: 28,
    fuelPricePerGallon: 3.5,
    monthlyInsurance: 220,
    annualRegistration: 150,
    maintenancePerMile: 0.09,
    rideshareInsuranceAddOn: 40,
  });

  it("الصافي أقل من الإجمالي بفرق كبير — ده بيت القصيد", () => {
    const r = gigEarnings(
      { grossEarnings: 2400, workMiles: 1600, totalMiles: 2000, milesPerHour: 18, car },
      tables,
    );
    expect(r.net).toBeLessThan(r.gross);
    expect(r.gross - r.net).toBeGreaterThan(400);
  });

  it("realHourlyWage أقل بكتير من الإجمالي على الساعات", () => {
    const r = gigEarnings(
      { grossEarnings: 2400, workMiles: 1600, totalMiles: 2000, milesPerHour: 18, car },
      tables,
    );
    const naive = 2400 / (1600 / 18);
    expect(r.realHourlyWage!).toBeLessThan(naive);
  });

  it("نصيب الجيج من تكلفة العربية بالنسبة للأميال", () => {
    const all = gigEarnings(
      { grossEarnings: 2000, workMiles: 2000, totalMiles: 2000, milesPerHour: 18, car },
      tables,
    );
    const half = gigEarnings(
      { grossEarnings: 2000, workMiles: 1000, totalMiles: 2000, milesPerHour: 18, car },
      tables,
    );
    expect(half.carShare).toBeCloseTo(all.carShare / 2);
  });

  it("مفيش متوسط أميال في الساعة = مفيش أجر بالساعة (مش تخمين)", () => {
    const r = gigEarnings(
      { grossEarnings: 2000, workMiles: 1500, totalMiles: 2000, milesPerHour: null, car },
      tables,
    );
    expect(r.realHourlyWage).toBeNull();
    expect(r.missingFields).toContain("milesPerHour");
  });

  it("نسبة الميل ناقصة بتتسجل", () => {
    const broken: TaxTables = { ...tables, irsMileageRate: missing<number>() };
    const r = gigEarnings(
      { grossEarnings: 2000, workMiles: 1500, totalMiles: 2000, milesPerHour: 18, car },
      broken,
    );
    expect(r.missingFields).toContain("irsMileageRate");
  });
});

/**
 * ⚠️ الفرق بين "صفر" و"مش عارفين" في ضريبة الولاية.
 *
 * تكساس وفلوريدا ونيفادا وتينيسي وواشنطن مسجّل عندنا صراحة إن مفيش
 * فيهم ضريبة دخل — بس الحاسبة كانت بتقرا `incomeTaxRate` (اللي `null`
 * بطبيعته في الولايات دي) وتقول للمستخدم "محتاج تأكيد" وتحط علامة
 * استفهام مكان الرقم. يعني بنقوله "مش عارفين" عن حاجة عارفينها،
 * واللي بيقارن عرض شغل في تكساس بعرض في كاليفورنيا كان بيلاقي نص
 * المقارنة فاضي.
 */
describe("ضريبة الولاية: صفر مش زي ناقص", () => {
  it("صفر بيتحسب ومبيتعلّمش ناقص", () => {
    const r = takeHome(
      {
        annualSalary: 60_000,
        filingStatus: "single",
        dependents: 0,
        stateTax: 0,
        localTaxRate: null,
        householdSize: 1,
      },
      tables,
    );
    expect(r.missingFields).not.toContain("stateTax");
    expect(r.lines.find((l) => l.key === "state")!.missing).toBe(false);
    expect(r.lines.find((l) => l.key === "state")!.amount).toBe(0);
  });

  it("null بيفضل ناقص — مش بيتحول صفر بالسكوت", () => {
    const r = takeHome(
      {
        annualSalary: 60_000,
        filingStatus: "single",
        dependents: 0,
        stateTax: null,
        localTaxRate: null,
        householdSize: 1,
      },
      tables,
    );
    expect(r.missingFields).toContain("stateTax");
    expect(r.lines.find((l) => l.key === "state")!.missing).toBe(true);
  });
});
