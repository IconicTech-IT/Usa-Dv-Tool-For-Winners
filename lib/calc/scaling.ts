import type { AgeGroups } from "@/lib/calc/ages";
import { followRuleOf, type ItemDef, type Scaling, type TimelineStage } from "@/lib/calc/catalog";
import type { Rate } from "@/lib/calc/currency";
import {
  LATE_ARRIVAL_WARNING_MONTHS,
  MAX_FOLLOW_MONTHS,
  type AmountField,
  type PlanState,
} from "@/lib/calc/model";
import { parseAmount } from "@/lib/calc/parse-amount";

/**
 * How many times an item's typed amount counts, and in which stage of the money timeline.
 *
 * Everyone travels together by default. When the family follows the principal later, the paperwork is
 * unchanged (all get visas together) but the travel, the arrival and the monthly costs fall in
 * two phases: the principal alone, then the whole family from the month the family arrives.
 */

export interface HouseholdContext {
  adults: number;
  children: number;
  registrations: number;
  /** How many of the children fall in each age group; see ages.ts. */
  ages: AgeGroups;
  rate: Rate | null;
  /** Months the family arrives after the principal; null when everyone travels together. */
  followMonths: number | null;
}

/** The spouse counts once however many adults travel: only a spouse is written on the entry. */
export function spouseCount(adults: number): number {
  return adults > 1 ? 1 : 0;
}

type Count = (context: HouseholdContext) => number;

/** How many times an amount counts for the whole household, by how it scales. */
const WHOLE_HOUSEHOLD: Record<Scaling, Count> = {
  total: () => 1,
  perPerson: ({ adults, children }) => adults + children,
  perAdult: ({ adults }) => adults,
  perEntrant: ({ adults, children }) => 1 + spouseCount(adults) + children,
  applicantOnly: () => 1,
  perFamilyMember: ({ adults, children }) => spouseCount(adults) + children,
  perRegistration: ({ registrations }) => registrations,
  perAge16Plus: ({ adults, ages }) => adults + ages.from16,
  perAge15Plus: ({ adults, ages }) => adults + ages.from15,
  perUnder15: ({ ages }) => ages.under15,
  perUnderSchool: ({ ages }) => ages.underSchool,
  perAdultFare: ({ adults, ages }) => adults + ages.adultFare,
  perChildFare: ({ ages }) => ages.childFare,
  perInfantFare: ({ ages }) => ages.infants,
};

export function multiplierFor(scaling: Scaling, context: HouseholdContext): number {
  return WHOLE_HOUSEHOLD[scaling](context);
}

/** How many times an amount counts while the principal is alone: the spouse and the children are not there. */
const PRINCIPAL_ALONE: Record<Scaling, Count> = {
  total: () => 1,
  perPerson: () => 1,
  perAdult: () => 1,
  perEntrant: () => 1,
  applicantOnly: () => 1,
  perFamilyMember: () => 0,
  perRegistration: ({ registrations }) => registrations,
  perAge16Plus: () => 1,
  perAge15Plus: () => 1,
  perUnder15: () => 0,
  perUnderSchool: () => 0,
  perAdultFare: () => 1,
  perChildFare: () => 0,
  perInfantFare: () => 0,
};

function aloneMultiplier(scaling: Scaling, context: HouseholdContext): number {
  return PRINCIPAL_ALONE[scaling](context);
}

/** What the family adds on top of the principal; a whole-household amount is counted once, not again. */
function familyMultiplier(scaling: Scaling, context: HouseholdContext): number {
  return scaling === "total" ? 0 : multiplierFor(scaling, context) - aloneMultiplier(scaling, context);
}

/** The scaling an item uses now: a toggle item follows the box's "per person" switch. */
export function effectiveScaling(def: ItemDef, field: AmountField): Scaling {
  if (def.toggle) return field.perPerson ? "perPerson" : "total";
  return def.scaling;
}

/** One share of an item: the stage it falls in and how many times the typed amount counts there. */
export interface Placement {
  stage: TimelineStage;
  multiplier: number;
}

/** The months the family arrives after the principal; null when everyone travels together or it is not typed yet. */
export function followMonthsOf(state: PlanState): number | null {
  const { adults, children } = state.household;
  if (state.travel.mode !== "follow" || adults + children < 2) return null;
  const parsed = parseAmount(state.travel.followMonths);
  if (!parsed.ok || parsed.amount.scale !== 0) return null;
  const months = Number(parsed.amount.units);
  return months >= 1 && months <= MAX_FOLLOW_MONTHS ? months : null;
}

/** True when the family would wait long enough that the visa's printed expiry may be a problem. */
export function isLateArrival(months: number | null): boolean {
  return months !== null && months >= LATE_ARRIVAL_WARNING_MONTHS;
}

/** How many times the whole household counts for an item; zero hides the item (nobody to count). */
export function householdMultiplier(def: ItemDef, scaling: Scaling, context: HouseholdContext): number {
  // The family's costs back home exist only while the family is apart from the principal.
  if (followRuleOf(def) === "whileApart" && context.followMonths === null) return 0;
  return multiplierFor(scaling, context);
}

function oneTimePlacements(def: ItemDef, scaling: Scaling, context: HouseholdContext): Placement[] {
  const alone = aloneMultiplier(scaling, context);
  const family = familyMultiplier(scaling, context);
  switch (followRuleOf(def)) {
    case "alone":
      return [{ stage: def.stage, multiplier: alone }];
    case "family":
      return [{ stage: "familyArrival", multiplier: scaling === "total" ? 1 : family }];
    case "split":
      return [
        { stage: def.stage, multiplier: alone },
        { stage: "familyArrival", multiplier: family },
      ];
    case "together":
    case "whileApart":
      return [{ stage: def.stage, multiplier: multiplierFor(scaling, context) }];
  }
}

function monthlyPlacements(
  def: ItemDef,
  scaling: Scaling,
  context: HouseholdContext,
  months: number,
): Placement[] {
  // The months alone are typed in their own boxes (one person's costs); the family's boxes count from
  // the month after it arrives. Only the family's costs back home belong to the months alone.
  if (followRuleOf(def) === "whileApart") return [{ stage: "aloneMonths", multiplier: months }];
  return [{ stage: "monthly", multiplier: multiplierFor(scaling, context) }];
}

/**
 * Where an item's money falls and how many times the typed amount counts there. One share when everyone
 * travels together (as always); several when the family follows later. Shares that count nobody are left out.
 */
export function placementsOf(def: ItemDef, scaling: Scaling, context: HouseholdContext): Placement[] {
  const { followMonths } = context;
  if (followMonths === null)
    return [{ stage: def.stage, multiplier: householdMultiplier(def, scaling, context) }];
  const shares =
    def.stage === "monthly"
      ? monthlyPlacements(def, scaling, context, followMonths)
      : oneTimePlacements(def, scaling, context);
  return shares.filter((share) => share.multiplier > 0);
}
