/**
 * حاسبة صافي المرتب.
 *
 * ⚠️ **مفيش ولا رقم ضريبي في الملف ده.** كله بيتقرا من
 * `content/tax-brackets.json` و `content/states/` و `content/metros/`.
 * لو رقم ناقص، الحاسبة **بتقول إنه ناقص** — مبتفترضش صفر ومبتخمّنش.
 * السبب: نسخة سابقة من الفكرة كان فيها ملف مكتوب فوقه "2026 brackets"
 * والأرقام تحته بتاعة 2024، والناس بتحسب على الأرقام دي فلوسها.
 */

import type { Field, Localized } from "@/lib/types";

export type FilingStatus = "single" | "married" | "headOfHousehold";

export interface Bracket {
  upTo: number | null;
  rate: number;
}

export interface TaxTables {
  taxYear: Field<number>;
  federalBrackets: Record<FilingStatus, Field<Bracket[]>>;
  standardDeduction: Record<FilingStatus, Field<number>>;
  socialSecurityRate: Field<number>;
  socialSecurityWageCap: Field<number>;
  medicareRate: Field<number>;
  childTaxCredit: Field<number>;
  irsMileageRate: Field<number>;
  selfEmploymentRate: Field<number>;
  federalPovertyLine: { base: Field<number>; perPerson: Field<number> };
}

export interface TakeHomeInput {
  annualSalary: number;
  filingStatus: FilingStatus;
  dependents: number;
  /** نسبة ثابتة (رقم) أو شرايح تصاعدية (مصفوفة) — الاتنين مدعومين */
  stateTax: number | Bracket[] | null;
  /** ضريبة دخل المدينة — نيويورك وفيلادلفيا وديترويت وغيرهم */
  localTaxRate: number | null;
  householdSize: number;
}

export interface TakeHomeLine {
  key: string;
  label: Localized;
  amount: number;
  /** الرقم ده مبني على حقل ناقص؟ ساعتها مبيتعرضش كرقم */
  missing: boolean;
}

export interface TakeHomeResult {
  gross: number;
  lines: TakeHomeLine[];
  /** الرقم الأكبر في الصفحة */
  netAnnual: number;
  netMonthly: number;
  effectiveRate: number | null;
  missingFields: string[];
  /** سنة الضرايب مش السنة الحالية → تنبيه فوق النتيجة */
  staleTaxYear: number | null;
}

/** بيطبق شرايح تصاعدية على مبلغ. الشريحة الأخيرة `upTo: null`. */
export function applyBrackets(amount: number, brackets: Bracket[]): number {
  let tax = 0;
  let floor = 0;

  for (const b of brackets) {
    if (amount <= floor) break;
    const ceiling = b.upTo ?? Infinity;
    const slice = Math.min(amount, ceiling) - floor;
    if (slice > 0) tax += slice * b.rate;
    floor = ceiling;
  }

  return tax;
}

function num(f: Field<number> | undefined): number | null {
  return f && typeof f.value === "number" ? f.value : null;
}

export function takeHome(input: TakeHomeInput, tables: TaxTables): TakeHomeResult {
  const missing: string[] = [];
  const track = <T>(name: string, v: T | null): T | null => {
    if (v === null) missing.push(name);
    return v;
  };

  const gross = Math.max(0, input.annualSalary);

  // ---- FICA ----
  const ssRate = track("socialSecurityRate", num(tables.socialSecurityRate));
  const ssCap = track("socialSecurityWageCap", num(tables.socialSecurityWageCap));
  const medicareRate = track("medicareRate", num(tables.medicareRate));

  const socialSecurity =
    ssRate !== null && ssCap !== null ? Math.min(gross, ssCap) * ssRate : 0;
  const medicare = medicareRate !== null ? gross * medicareRate : 0;

  // ---- الفيدرالية ----
  const deductionField = tables.standardDeduction[input.filingStatus];
  const deduction = track("standardDeduction", num(deductionField));
  const bracketsField = tables.federalBrackets[input.filingStatus];
  const brackets = track(
    "federalBrackets",
    Array.isArray(bracketsField?.value) ? bracketsField.value : null,
  );
  const childCredit = track("childTaxCredit", num(tables.childTaxCredit));

  const taxable = deduction !== null ? Math.max(0, gross - deduction) : 0;
  const federalBeforeCredit = brackets ? applyBrackets(taxable, brackets) : 0;
  const federal =
    childCredit !== null
      ? Math.max(0, federalBeforeCredit - childCredit * input.dependents)
      : federalBeforeCredit;

  // ---- الولاية: نسبة ثابتة أو شرايح ----
  let stateTax = 0;
  if (input.stateTax === null) {
    missing.push("stateTax");
  } else if (Array.isArray(input.stateTax)) {
    stateTax = applyBrackets(taxable, input.stateTax);
  } else {
    stateTax = gross * input.stateTax;
  }

  // ---- المدينة ----
  let localTax = 0;
  if (input.localTaxRate !== null) localTax = gross * input.localTaxRate;

  const lines: TakeHomeLine[] = [
    {
      key: "federal",
      label: { ar: "الضريبة الفيدرالية", en: "Federal income tax" },
      amount: federal,
      missing: brackets === null || deduction === null,
    },
    {
      key: "socialSecurity",
      label: { ar: "الضمان الاجتماعي", en: "Social Security" },
      amount: socialSecurity,
      missing: ssRate === null || ssCap === null,
    },
    {
      key: "medicare",
      label: { ar: "الميديكير", en: "Medicare" },
      amount: medicare,
      missing: medicareRate === null,
    },
    {
      key: "state",
      label: { ar: "ضريبة الولاية", en: "State income tax" },
      amount: stateTax,
      missing: input.stateTax === null,
    },
    {
      key: "local",
      label: { ar: "ضريبة المدينة", en: "City income tax" },
      amount: localTax,
      missing: false,
    },
  ];

  const totalTax = lines.reduce((t, l) => t + l.amount, 0);
  const netAnnual = gross - totalTax;

  const taxYear = num(tables.taxYear);
  const currentYear = new Date().getFullYear();

  return {
    gross,
    lines,
    netAnnual,
    netMonthly: netAnnual / 12,
    effectiveRate: gross > 0 ? totalTax / gross : null,
    missingFields: missing,
    staleTaxYear: taxYear !== null && taxYear !== currentYear ? taxYear : null,
  };
}

/* ------------------------------------------------------------------ *
 * تقدير دعم التأمين الصحي
 * ------------------------------------------------------------------ */

export interface SubsidyEstimate {
  /** الدخل كنسبة من خط الفقر الفيدرالي */
  percentOfPovertyLine: number | null;
  /** تقدير مبدئي جدًا — مش وعد */
  likelyMedicaidEligible: boolean | null;
  missingFields: string[];
}

export function healthSubsidy(
  annualIncome: number,
  householdSize: number,
  tables: TaxTables,
): SubsidyEstimate {
  const missing: string[] = [];
  const base = num(tables.federalPovertyLine.base);
  const per = num(tables.federalPovertyLine.perPerson);

  if (base === null) missing.push("federalPovertyLine.base");
  if (per === null) missing.push("federalPovertyLine.perPerson");
  if (base === null || per === null) {
    return { percentOfPovertyLine: null, likelyMedicaidEligible: null, missingFields: missing };
  }

  const line = base + per * Math.max(0, householdSize - 1);
  const pct = line > 0 ? annualIncome / line : null;

  return {
    percentOfPovertyLine: pct,
    // ⚠️ تقدير تقريبي جدًا: توسيع الميديكيد بيختلف من ولاية لولاية،
    // فالنتيجة دي بتوجّه المستخدم يسأل مش بتحسم.
    likelyMedicaidEligible: pct === null ? null : pct <= 1.38,
    missingFields: missing,
  };
}
