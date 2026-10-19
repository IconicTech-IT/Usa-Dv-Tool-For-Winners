import { findItem, type Calculator, type Stage } from "@/lib/calc/catalog";
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

/** The total of every box that belongs to one calculator, in the plan's current mode. */
export function subtotalOfCalculator(result: PlanResult, calculator: Calculator): Subtotal {
  const ids = result.items.filter((item) => findItem(item.id)?.calculator === calculator).map((i) => i.id);
  return subtotalOf(result, ids);
}

export interface ForgottenStage {
  stage: Stage;
  /** Ids of the boxes nobody typed an amount into. */
  itemIds: string[];
}

/** The stages that still have empty boxes, for the "what did I forget?" list. */
export function forgottenByStage(result: PlanResult): ForgottenStage[] {
  return result.stages
    .filter((stage) => stage.emptyIds.length > 0)
    .map((stage) => ({ stage: stage.stage, itemIds: stage.emptyIds }));
}

/** A link that opens WhatsApp with the text ready; the person chooses who gets it. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
