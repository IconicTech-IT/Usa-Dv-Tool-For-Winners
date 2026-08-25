/**
 * حاسبة أرباح تطبيقات التوصيل والعربية.
 *
 * ⚠️ أهم رقم في الصفحة كلها: `realHourlyWage` — الأجر الحقيقي في الساعة
 * بعد كل المصاريف والضرايب. "كسبت $1,400 الشهر ده" رقم بيضحك على صاحبه:
 * البنزين والاستهلاك والضرايب بياكلوا نص الرقم ده.
 *
 * مفيش رقم ثابت هنا — كله بيتقرا من `content/`.
 */

import type { Field } from "@/lib/types";
import type { TaxTables } from "./tax";

export interface CarMonthlyCost {
  loanPayment: number;
  insurance: number;
  fuel: number;
  maintenance: number;
  registration: number;
  total: number;
  missingFields: string[];
}

export interface CarInput {
  price: number;
  downPayment: number;
  /** نسبة الفايدة السنوية — بتتحدد بحالة الائتمان */
  apr: number;
  loanMonths: number;
  monthlyMiles: number;
  mpg: number;
  fuelPricePerGallon: number | null;
  monthlyInsurance: number | null;
  annualRegistration: number | null;
  maintenancePerMile: number | null;
  /** إضافة تأمين الرايدشير لو بيشتغل توصيل */
  rideshareInsuranceAddOn: number;
}

/** قسط القرض بمعادلة الإهلاك الشهري. APR صفر = تقسيم بسيط. */
export function loanPayment(
  principal: number,
  apr: number,
  months: number,
): number {
  if (months <= 0) return 0;
  if (principal <= 0) return 0;
  if (apr <= 0) return principal / months;

  const r = apr / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function carMonthlyCost(input: CarInput): CarMonthlyCost {
  const missing: string[] = [];

  const financed = Math.max(0, input.price - input.downPayment);
  const payment = loanPayment(financed, input.apr, input.loanMonths);

  if (input.monthlyInsurance === null) missing.push("carInsurance");
  if (input.fuelPricePerGallon === null) missing.push("fuelPrice");
  if (input.maintenancePerMile === null) missing.push("maintenancePerMile");
  if (input.annualRegistration === null) missing.push("registration");

  const insurance =
    (input.monthlyInsurance ?? 0) + (input.rideshareInsuranceAddOn ?? 0);
  const fuel =
    input.fuelPricePerGallon !== null && input.mpg > 0
      ? (input.monthlyMiles / input.mpg) * input.fuelPricePerGallon
      : 0;
  const maintenance = (input.maintenancePerMile ?? 0) * input.monthlyMiles;
  const registration = (input.annualRegistration ?? 0) / 12;

  return {
    loanPayment: payment,
    insurance,
    fuel,
    maintenance,
    registration,
    total: payment + insurance + fuel + maintenance + registration,
    missingFields: missing,
  };
}

/* ------------------------------------------------------------------ */

export interface GigInput {
  /** الإجمالي اللي التطبيق بيقوله */
  grossEarnings: number;
  /** أميال الشغل بس */
  workMiles: number;
  /** إجمالي أميال العربية في الشهر (شغل + شخصي) */
  totalMiles: number;
  /** متوسط الأميال في الساعة في المدينة دي */
  milesPerHour: number | null;
  car: CarMonthlyCost;
}

export interface GigResult {
  gross: number;
  mileageDeduction: number;
  taxableProfit: number;
  selfEmploymentTax: number;
  carShare: number;
  net: number;
  estimatedHours: number | null;
  /** ⚠️ الرقم اللي بيغيّر قرار الناس فعلًا */
  realHourlyWage: number | null;
  missingFields: string[];
}

export function gigEarnings(input: GigInput, tables: TaxTables): GigResult {
  const missing = [...input.car.missingFields];

  const mileageRate =
    typeof tables.irsMileageRate.value === "number"
      ? tables.irsMileageRate.value
      : null;
  const seRate =
    typeof tables.selfEmploymentRate.value === "number"
      ? tables.selfEmploymentRate.value
      : null;

  if (mileageRate === null) missing.push("irsMileageRate");
  if (seRate === null) missing.push("selfEmploymentRate");
  if (input.milesPerHour === null) missing.push("milesPerHour");

  const mileageDeduction = (mileageRate ?? 0) * input.workMiles;
  const taxableProfit = Math.max(0, input.grossEarnings - mileageDeduction);
  const selfEmploymentTax = taxableProfit * (seRate ?? 0);

  // نصيب الشغل من تكلفة العربية بالنسبة للأميال
  const share =
    input.totalMiles > 0 ? Math.min(1, input.workMiles / input.totalMiles) : 1;
  const carShare = input.car.total * share;

  const net = input.grossEarnings - carShare - selfEmploymentTax;

  const estimatedHours =
    input.milesPerHour && input.milesPerHour > 0
      ? input.workMiles / input.milesPerHour
      : null;

  return {
    gross: input.grossEarnings,
    mileageDeduction,
    taxableProfit,
    selfEmploymentTax,
    carShare,
    net,
    estimatedHours,
    realHourlyWage:
      estimatedHours && estimatedHours > 0 ? net / estimatedHours : null,
    missingFields: [...new Set(missing)],
  };
}

/* ------------------------------------------------------------------ *
 * نقطة التعادل: تشتري ولا تأجر من التطبيق؟
 * ------------------------------------------------------------------ */

export function breakEvenMonths(
  ownMonthly: number,
  rentMonthly: number,
  downPayment: number,
): number | null {
  const saving = rentMonthly - ownMonthly;
  if (saving <= 0) return null; // الشرا مش بيوفر أصلًا
  return downPayment / saving;
}

/**
 * حالة الائتمان بتحدد الـAPR.
 * ⚠️ المهاجر الجديد مالوش تاريخ ائتماني، فبياخد أعلى نسبة — والرقم ده
 * بيتعرض بصراحة من غير تلطيف، لأن الناس لازم تشوفه **قبل** ما تدخل
 * معرض عربيات مش بعديها. الأرقام دي بتتقرا من content/ مش من هنا.
 */
export type CreditProfile = "new_immigrant" | "thin_file" | "fair" | "good";

export function aprFor(
  profile: CreditProfile,
  table: Record<CreditProfile, Field<number>>,
): number | null {
  const f = table[profile];
  return f && typeof f.value === "number" ? f.value : null;
}
