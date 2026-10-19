import type { FollowPhases } from "@/lib/calc/follow";
import { ZERO_CENTS, type Cents } from "@/lib/calc/money";

/**
 * How far the savings go, said in one sentence on the results and the months pages: after the costs that
 * are paid once, how many months of the monthly costs the savings cover; or how much is still to save when
 * they do not even cover those. Nothing here is a price: it only turns the numbers the user typed into months.
 */

/** More months than this are shown as this many: the number is only a way to say "plenty". */
export const MAX_COVERED_MONTHS = 999;

export type Coverage = { kind: "short"; shortCents: Cents } | { kind: "months"; months: number };

export interface CoverageInput {
  /** The user typed his savings. */
  savingsTyped: boolean;
  savingsCents: Cents;
  /** Everything that is paid once, up to and including the family's arrival when it follows later. */
  oneTimeCents: Cents;
  /** One month of the whole household's costs. */
  monthlyCents: Cents;
  /** Set when the family follows later: the months alone cost less, then the whole family's month applies. */
  phases: FollowPhases | null;
}

function cap(months: bigint): number {
  return months > BigInt(MAX_COVERED_MONTHS) ? MAX_COVERED_MONTHS : Number(months);
}

/** The months a budget covers when the principal is alone for the first months and the family joins after. */
function monthsInTwoPhases(budget: Cents, phases: FollowPhases): number | null {
  const alone = phases.aloneMonthlyCents;
  const full = phases.fullMonthlyCents;
  const aloneTotal = alone * BigInt(phases.months);
  if (alone > ZERO_CENTS && budget < aloneTotal) return cap(budget / alone);
  if (full === ZERO_CENTS) return null;
  return cap(BigInt(phases.months) + (budget - aloneTotal) / full);
}

export function coverageOf(input: CoverageInput): Coverage | null {
  if (!input.savingsTyped) return null;
  const budget = input.savingsCents - input.oneTimeCents;
  if (budget < ZERO_CENTS) return { kind: "short", shortCents: -budget };

  if (input.phases !== null) {
    const months = monthsInTwoPhases(budget, input.phases);
    return months === null ? null : { kind: "months", months };
  }
  if (input.monthlyCents === ZERO_CENTS) return null;
  return { kind: "months", months: cap(budget / input.monthlyCents) };
}
