import type { CostKey } from "./overrides";

/**
 * البنود اللي ليها حاسبة تخصها.
 *
 * الفكرة: بند في الخطة مكتوب عليه "مش عارفينه" قدامه طريقين — يكتب الرقم
 * على طول، أو يروح يحسبه في الحاسبة ويرجع. والحاسبة بتكتب نتيجتها في نفس
 * المكان اللي المحرر بيكتب فيه (`overrides` في الstore)، فالرجوع مش محتاج
 * نسخ ولا لصق — الرقم بيبقى مستنيه في خطته.
 *
 * ⚠️ البند اللي مالوش حاسبة **مبيتحطش هنا**. زرار بيوعد بحاجة مش موجودة
 * أوحش من مفيش زرار.
 */
export const TOOL_FOR_COST: Partial<Record<CostKey, string>> = {
  carInsurance: "/calculators/car",
};

export function toolFor(key: string): string | undefined {
  return TOOL_FOR_COST[key as CostKey];
}
