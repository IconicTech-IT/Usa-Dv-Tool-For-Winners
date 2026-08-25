/** الأنواع المشتركة بين كل الأدوات. */

export type FieldStatus =
  | "verified"
  | "estimated"
  | "judgment"
  | "NEEDS_VERIFICATION";

export interface Source {
  label: string;
  url: string;
}

export type Localized = { ar: string; en: string };

export interface Field<T = number> {
  value: T | null;
  unit?: string;
  range?: [number, number];
  status: FieldStatus;
  sources: Source[];
  lastVerified: string;
  note?: string;
  /** مع `estimated`: التقدير جه منين. بيظهر في tooltip. */
  basis?: Localized;
  /** مع `estimated`: يتراجع كل قد إيه. */
  verifyIn?: string;
  /** مع `judgment`: الوصف اللي بيتعرض **مكان** الرقم. */
  label?: Localized;
}

/** مُدخلات الخطة — دي بالظبط اللي بتتحفظ في localStorage.
 *  ⚠️ مفيش رقم حالة ولا أي حقل بيفترض إن المستخدم فايز.
 *  الحقول الاختيارية (?) لازم تفضل اختيارية — الخطة بتشتغل من غيرها. */
export interface PlannerInput {
  money: number;
  moneyIncludesTravel: boolean;
  monthlyIncomeFromHome: number;
  monthlyDebt: number;

  travellingAlone: boolean;
  adults: number;
  kidsAges: number[];
  spouseWillWork: boolean;

  // اختياري — واحد لسه مكسبش مش هيبقى عنده مواعيد
  plannedArrival?: string; // YYYY-MM-DD

  hostCity: string | null;
  hostNights: number;

  englishLevel: 0 | 1 | 2 | 3 | 4;
  drivingYears: number;
  profession: string;
  openToPhysicalWork: boolean;

  /** مرتبة من الأهم للأقل */
  priorities: Array<"fastIncome" | "lowCost" | "schools" | "community" | "career">;
}

export type Tier = "A" | "B" | "C" | "D";

/**
 * الأداة ليها اتجاهين على نفس المحرك:
 *   have → "معايا كام؟"  → بيطلع runway وخطة
 *   need → "محتاج كام؟"  → بيطلع المبلغ المطلوب
 * الاتجاه التاني هو اللي بيسأله اللي لسه مكسبش، وهو اللي بيخليه يبدأ يدخر.
 */
export type PlanDirection = "have" | "need";

/** مُدخلات اتجاه "محتاج كام؟" — أقل بكتير، لأن السؤال أبسط. */
export interface RequiredAmountInput {
  metro: string;
  adults: number;
  kidsAges: number[];
  /** كام شهر عايز يقدر يعيش من غير شغل */
  monthsWithoutWork: number;
  includeTravel: boolean;
  monthlyIncomeFromHome: number;
}

export interface RequiredAmountResult {
  metro: string;
  /** المبلغ المطلوب إجمالًا — ده أكبر رقم في الصفحة */
  totalNeeded: number;
  landingCost: number;
  monthlyBurn: number;
  monthsWithoutWork: number;
  breakdown: { key: string; label: Localized; amount: number }[];
  /** الحقول اللي الحسبة اعتمدت عليها وهي لسه مش مؤكدة */
  unverifiedFields: string[];
  sources: Source[];
}

export interface PlanResult {
  tier: Tier;
  runwayMonths: number;
  landingCost: number;
  monthlyBurn: number;
  goAlone: boolean;
  reasons: Localized[];
  recommendedMetros: MetroScore[];
  avoidMetros: MetroScore[];
  monthlyProjection: {
    month: number;
    slow: number;
    expected: number;
    fast: number;
  }[];
  weeklyActions: { week: number; task: Localized }[];
  risks: { risk: Localized; mitigation: Localized }[];
  /** كل رقم في الخطة لازم يشاور على مصدره */
  sources: Source[];
  unverifiedFields: string[];
}

export interface MetroScore {
  slug: string;
  name: Localized;
  score: number;
  runwayMonths: number;
  why: Localized[];
  /** نصيب أحكام الترتيب الذاتي من الscore — مسقوف، وبيتراجع في الtests. */
  judgmentContribution: number;
}
