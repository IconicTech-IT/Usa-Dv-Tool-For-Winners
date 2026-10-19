import type { PlanResult, Scenario } from "@/lib/calc/compute";
import { ZERO_CENTS, type Cents } from "@/lib/calc/money";

export interface Subtotal {
  cents: Cents;
  /** Some typed amount could not be converted yet because no rate was typed. */
  incomplete: boolean;
  /** At least one of the items has a valid typed amount. */
  hasTyped: boolean;
}

/** The total of some items of the plan (one screen group, for example). */
export function subtotalOf(result: PlanResult, itemIds: readonly string[]): Subtotal {
  const ids = new Set(itemIds);
  let cents = ZERO_CENTS;
  let incomplete = false;
  let hasTyped = false;
  for (const item of result.items) {
    if (!ids.has(item.id)) continue;
    if (item.cents !== null) cents += item.cents;
    if (item.needsRate) incomplete = true;
    if (item.typed) hasTyped = true;
  }
  return { cents, incomplete, hasTyped };
}

/** What a scenario needs in all, before the savings the user already holds are taken off. */
export function scenarioTotalCents(scenario: Scenario, result: PlanResult): Cents {
  return scenario.requiredCents + result.savingsCents;
}
