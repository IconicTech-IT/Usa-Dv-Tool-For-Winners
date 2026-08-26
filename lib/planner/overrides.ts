/**
 * أرقام المستخدم نفسه.
 *
 * المبدأ: **رقم المستخدم أصدق من أي تقدير عندنا.**
 * لو لقى غرفة بـ$650 فعلًا، ده الرقم الصح لخطته — مش متوسطنا ولا
 * تقديرنا. ولو شايف إنه هيستغنى عن بند كامل، ده قراره وبيتحسب صفر.
 *
 * وده كمان بيفك أهم قفلة في الموقع: بند مالوش رقم عندنا كان بيوقف
 * الحسبة تمامًا. دلوقتي المستخدم يقدر يفكها بنفسه.
 */

/** البنود اللي المستخدم يقدر يتحكم فيها. */
export const COST_KEYS = [
  "roomRent",
  "apt1br",
  "apt2br",
  "securityDeposit",
  "utilities",
  "groceriesPerAdult",
  "carInsurance",
  "monthlyTransitPass",
  "travel",
  "setup",
  "phone",
] as const;

export type CostKey = (typeof COST_KEYS)[number];

/** بنود مش مربوطة بمدينة — بتتخزن تحت السكوب ده. */
export const GLOBAL_SCOPE = "_global";

/** البنود اللي مش بتتغير بتغير المدينة. */
const GLOBAL_KEYS: ReadonlySet<string> = new Set(["travel", "setup", "phone"]);

export function scopeFor(key: CostKey, metroSlug: string): string {
  return GLOBAL_KEYS.has(key) ? GLOBAL_SCOPE : metroSlug;
}

export type Override =
  /** رقم المستخدم — بيغلب أي حاجة عندنا */
  | { mode: "custom"; value: number }
  /** "مش هحتاج ده" — بيتحسب صفر، وده قرار مش نقص بيانات */
  | { mode: "skip" };

/** مفتاح أول: سكوب (slug المدينة أو `_global`). مفتاح تاني: البند. */
export type CostOverrides = Record<string, Partial<Record<CostKey, Override>>>;

export function getOverride(
  overrides: CostOverrides | undefined,
  key: CostKey,
  metroSlug: string,
): Override | undefined {
  return overrides?.[scopeFor(key, metroSlug)]?.[key];
}

/** من فين جه الرقم اللي اتحسب. الواجهة بتعرض ده للمستخدم. */
export type ValueSource = "user" | "skipped" | "site" | "missing";

export interface Resolved {
  value: number | null;
  source: ValueSource;
}

/**
 * الترتيب: رقم المستخدم → "مش محتاجه" → رقم الموقع → ناقص.
 * `null` معناها ناقص فعلًا — **مش صفر**.
 */
export function resolveCost(
  siteValue: number | null,
  override: Override | undefined,
): Resolved {
  if (override?.mode === "custom" && Number.isFinite(override.value)) {
    return { value: Math.max(0, override.value), source: "user" };
  }
  if (override?.mode === "skip") {
    return { value: 0, source: "skipped" };
  }
  if (siteValue !== null) return { value: siteValue, source: "site" };
  return { value: null, source: "missing" };
}
