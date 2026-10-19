import { findItem, type Calculator } from "@/lib/calc/catalog";
import type { PlanState } from "@/lib/calc/model";

/** The page where each calculator's boxes are typed (detailed mode). */
export const CALCULATOR_PATH = {
  fees: "/fees",
  moving: "/moving",
  monthly: "/runway",
} as const satisfies Record<Calculator, string>;

export type CalculatorPath = (typeof CALCULATOR_PATH)[Calculator];

/** Where the user types one item: its calculator page, or the quick page in quick mode. */
export function pathForItem(itemId: string, mode: PlanState["uiMode"]): CalculatorPath | "/quick" {
  if (mode === "quick") return "/quick";
  const item = findItem(itemId);
  return item ? CALCULATOR_PATH[item.calculator] : "/fees";
}

/** Where to edit a whole calculator's numbers in the given mode. */
export function pathForCalculator(
  calculator: Calculator,
  mode: PlanState["uiMode"],
): CalculatorPath | "/quick" {
  return mode === "quick" ? "/quick" : CALCULATOR_PATH[calculator];
}
