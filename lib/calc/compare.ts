import { computePlan, type PlanResult } from "@/lib/calc/compute";
import type { PlanState } from "@/lib/calc/model";
import { scenarioTotalCents } from "@/lib/calc/summary";
import { ZERO_CENTS, type Cents } from "@/lib/calc/money";

/** One opened plan with what the comparison table shows about it. */
export interface PlanSummary {
  name: string;
  adults: number;
  children: number;
  oneTimeCents: Cents;
  monthlyCents: Cents;
  /** What the safest scenario (job starts after 3 months) needs in all. */
  safestTotalCents: Cents;
  savingsCents: Cents;
  stillToSaveCents: Cents;
  /** Some amount was typed in a local currency without a rate, so the totals are partial. */
  incomplete: boolean;
}

function safestScenario(result: PlanResult) {
  return result.scenarios[result.scenarios.length - 1];
}

/** Everything the comparison needs from a saved plan, all in US cents so two plans can be compared. */
export function summarizePlan(name: string, state: PlanState): PlanSummary {
  const result = computePlan(state);
  const safest = safestScenario(result);
  return {
    name,
    adults: result.adults,
    children: result.children,
    oneTimeCents: result.oneTimeCents,
    monthlyCents: result.monthlyCents,
    safestTotalCents: safest ? scenarioTotalCents(safest, result) : ZERO_CENTS,
    savingsCents: result.savingsCents,
    stillToSaveCents: safest ? safest.shortfallCents : ZERO_CENTS,
    incomplete: result.needsRate,
  };
}
