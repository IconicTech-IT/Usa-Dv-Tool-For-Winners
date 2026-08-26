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
  /** لبنود السكن بس: السعر ده شامل الفواتير، فالمحرك بيتخطى بند الفواتير. */
  includesUtilities?: boolean;
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

  /**
   * المستخدم عايز مدينة أو ولاية معينة؟
   *
   * الاتنين اختياريين — سايبهم فاضيين معناه "رشّحلي انت"، وده الوضع
   * الافتراضي. لو حدّد، الترشيح بيتحصر في اختياره والموقع بيفضل هو اللي
   * بيعمل الخطة **جوه** النطاق ده.
   */
  targetMetro?: string | null;
  targetState?: string | null;

  /**
   * هيجيب عربية ولا لأ.
   *
   * ⚠️ `"unsure"` مش قيمة فاضية — دي إجابة. اللي مش عارف بياخد **الخطتين**
   * جنب بعض عشان يشوف الفرق بفلوسه ويقرر، بدل ما إحنا نقرر عنه بالسكوت.
   * و`null` معناها إنه لسه ماردش على السؤال أصلًا، فبنرجع للسلوك القديم:
   * حاجة المدينة للعربية هي اللي بتحدد.
   */
  willBuyCar?: "yes" | "no" | "unsure" | null;
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
  landingBreakdown: import("@/lib/planner/engine").CostBreakdown[];
  burnBreakdown: import("@/lib/planner/engine").CostBreakdown[];
  /** نفس قاعدة PlanResult — من غير الأرقام الأساسية مفيش مبلغ */
  computable: boolean;
  missingEssential: string[];
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
  /** المدينة اللي الخطة اتحسبت عليها — الواجهة بتعدّل بنودها */
  chosenMetro: string;
  /** بنود تكلفة الوصول، كل بند بيقول رقمه جه منين */
  landingBreakdown: import("@/lib/planner/engine").CostBreakdown[];
  /** بنود المصاريف الشهرية */
  burnBreakdown: import("@/lib/planner/engine").CostBreakdown[];
  /**
   * ⚠️ هل الأرقام الأساسية موجودة أصلًا؟
   * لو لأ، الواجهة **ممنوع** تعرض runway ولا مصاريف شهرية — لأن
   * الحقول الناقصة بتتشال من الجمع، والناتج بيطلع متفائل بشكل كاذب
   * (مصاريف $150 في الشهر و"فلوسك تكفي ٣٠ شهر"). رقم مغلوط أسوأ
   * من مفيش رقم، والقاعدة دي بتتفرض هنا مش في الواجهة بس.
   */
  computable: boolean;
  /** الحقول اللي غيابها هو اللي منع الحسبة */
  missingEssential: string[];
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

  /**
   * الخطة بالعربية والخطة من غيرها، جنب بعض.
   *
   * بتتحسب بس لما المستخدم يقول **"مش عارف"** في سؤال العربية — ساعتها
   * إحنا مش بنقرر عنه، بنوريه الفرق بفلوسه هو ويقرر. `null` في الحالات
   * التانية لأن القرار اتاخد خلاص.
   */
  carScenarios: {
    withCar: { monthlyBurn: number; runwayMonths: number };
    withoutCar: { monthlyBurn: number; runwayMonths: number };
  } | null;
  weeklyActions: { week: number; task: Localized }[];
  risks: { risk: Localized; mitigation: Localized }[];
  /** كل رقم في الخطة لازم يشاور على مصدره */
  sources: Source[];
  unverifiedFields: string[];
}

export interface MetroScore {
  /**
   * ⚠️ عندنا أرقامها الأساسية؟
   * مدينة مش عارفين عنها حاجة **ممنوع** تترشح — مصاريفها بتطلع أقل
   * من الحقيقة فتبان أحسن من مدينة عندنا أرقامها فعلًا.
   */
  computable: boolean;
  slug: string;
  name: Localized;
  score: number;
  runwayMonths: number;
  why: Localized[];
  /** نصيب أحكام الترتيب الذاتي من الscore — مسقوف، وبيتراجع في الtests. */
  judgmentContribution: number;
}
