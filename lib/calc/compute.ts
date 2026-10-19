import {
  ALONE_MONTHLY_ITEMS,
  ITEMS,
  QUICK_ITEMS,
  TIMELINE_STAGES,
  type ItemDef,
  type TimelineStage,
} from "@/lib/calc/catalog";
import { ageGroups } from "@/lib/calc/ages";
import { coverageOf, type Coverage } from "@/lib/calc/coverage";
import { parseRate, type Rate } from "@/lib/calc/currency";
import { isZero, type Decimal } from "@/lib/calc/decimal";
import { addMonths, costOfMonths, type FollowPhases } from "@/lib/calc/follow";
import { multiplyCents, toUsdCents, usdCentsToLocalCents, ZERO_CENTS, type Cents } from "@/lib/calc/money";
import type { AmountField, PlanState } from "@/lib/calc/model";
import { parseAmount } from "@/lib/calc/parse-amount";
import {
  effectiveScaling,
  followMonthsOf,
  householdMultiplier,
  placementsOf,
  type HouseholdContext,
  type Placement,
} from "@/lib/calc/scaling";

/**
 * All the maths, in exact US cents (BigInt). Money amounts come only from what the user
 * typed; the only constants here are the formulas.
 *
 * Formulas (design note s2):
 *   stage total      = sum of its items, each multiplied by the household count when per person
 *   oneTime          = beforeEntry + beforeInterview + atInterview + beforeTravel + firstMonth (+ familyArrival)
 *   monthly          = sum of the monthly items
 *   scenario n       = oneTime + monthly * n + bufferMonths * monthly - savings   (n = 0, 1, 2, 3)
 *   netMonthlyAfter  = monthly - income - spouseIncome   (negative means a monthly surplus)
 *   timeline         = running total over the stages in order; the "monthly" stage adds one month
 *
 * When the family arrives some months after the principal, the same formulas run in two phases:
 * the months alone cost "aloneMonthly", the months after cost "monthly", and a scenario's months are
 * priced phase by phase (see follow.ts).
 */

export const SCENARIO_START_MONTHS = [0, 1, 2, 3] as const;
export type ScenarioStart = (typeof SCENARIO_START_MONTHS)[number];

/** The stages that make up the one-time total (everything except the monthly costs). */
const ONE_TIME_STAGES: readonly TimelineStage[] = [
  "beforeEntry",
  "beforeInterview",
  "atInterview",
  "beforeTravel",
  "firstMonth",
  "familyArrival",
];

/** The stages that exist only when the family follows later. */
const FOLLOW_ONLY_STAGES: readonly TimelineStage[] = ["aloneMonths", "familyArrival"];

/** The share of an item that falls in one stage, in US cents. */
export interface ItemPart {
  stage: TimelineStage;
  cents: Cents;
  /** How many times the typed amount counts in this share. */
  multiplier: number;
}

export interface ItemResult {
  id: string;
  /** The stage the item is listed under in "what did I forget". */
  stage: TimelineStage;
  /**
   * False when the item counts nobody in this household (the family items of a person alone). Such an
   * item is hidden, adds nothing whatever was typed in it before, and is not listed as forgotten.
   */
  applicable: boolean;
  /** The user typed a valid amount (zero counts as typed). */
  typed: boolean;
  /** Text is there but is not a valid non-negative number. */
  invalid: boolean;
  multiplier: number;
  /**
   * Amount in US cents after the multiplier; null when empty, invalid, or the rate is missing. For a
   * monthly item it is one month of the whole family.
   */
  cents: Cents | null;
  /** Where that money falls on the timeline (one share unless the family follows later). */
  parts: ItemPart[];
  /** Typed in the local currency but no valid rate was typed yet. */
  needsRate: boolean;
}

export interface StageResult {
  stage: TimelineStage;
  cents: Cents;
  /** Ids of items nobody typed an amount for ("what did I forget"). */
  emptyIds: string[];
  /** Some typed amount could not be converted (missing rate). */
  incomplete: boolean;
}

export interface TimelineEntry {
  stage: TimelineStage;
  stageCents: Cents;
  cumulativeCents: Cents;
}

export interface Scenario {
  startMonth: ScenarioStart;
  requiredCents: Cents;
  /** requiredCents when positive, else zero. */
  shortfallCents: Cents;
  /** The negative of requiredCents when it is negative, else zero. */
  surplusCents: Cents;
}

/** What is known when the family arrives some months after the principal. */
export interface FollowResult {
  /** Months until the family arrives. */
  months: number;
  /** One month of costs while the principal is alone, the family's costs back home included. */
  aloneMonthlyCents: Cents;
  /** Everything needed until the family arrives: all one-time money and the months alone, before savings. */
  cashByArrivalCents: Cents;
}

export interface PlanResult {
  rate: Rate | null;
  adults: number;
  children: number;
  persons: number;
  items: ItemResult[];
  /**
   * The boxes of the months the principal spends alone (one person's monthly costs), when the family
   * follows later. Each one's cents are one month alone; they are not applicable otherwise.
   */
  aloneItems: ItemResult[];
  stages: StageResult[];
  timeline: TimelineEntry[];
  oneTimeCents: Cents;
  monthlyCents: Cents;
  incomeCents: Cents;
  spouseIncomeCents: Cents;
  savingsCents: Cents;
  netMonthlyAfterStartCents: Cents;
  scenarios: Scenario[];
  /** How far the savings go after the costs paid once; null until savings are typed. */
  coverage: Coverage | null;
  /** How many children have no age typed yet (they are counted as small children until then). */
  agesUnknown: number;
  /** Set only when the family arrives some months after the principal. */
  follow: FollowResult | null;
  /** A local-currency amount exists but no valid rate was typed, so totals are partial. */
  needsRate: boolean;
}

/** The stage an item is listed under: where it first falls, or for a monthly item where it falls last (the full family). */
function listingStage(def: ItemDef, stages: readonly TimelineStage[]): TimelineStage {
  const stage = def.stage === "monthly" ? stages[stages.length - 1] : stages[0];
  return stage ?? def.stage;
}

/** The cents of an item that stand for the whole item: every share, but only one month of a monthly item. */
function headlineCents(parts: readonly ItemPart[]): Cents {
  return parts.filter((p) => p.stage !== "aloneMonths").reduce((sum, p) => sum + p.cents, ZERO_CENTS);
}

/** One typed amount spread over the stages it falls in. */
function sharesOf(single: Cents, placements: readonly Placement[]): ItemPart[] {
  return placements.map((p) => ({
    stage: p.stage,
    cents: single * BigInt(p.multiplier),
    multiplier: p.multiplier,
  }));
}

function computeItem(def: ItemDef, field: AmountField | undefined, context: HouseholdContext): ItemResult {
  const scaling = field ? effectiveScaling(def, field) : def.scaling;
  const multiplier = householdMultiplier(def, scaling, context);
  const placements = placementsOf(def, scaling, context);
  const stage = listingStage(
    def,
    placements.map((p) => p.stage),
  );
  const base = { id: def.id, stage, parts: [] };

  if (multiplier === 0) {
    // The typed text stays in the plan, so the item comes back with its value when the family is added.
    return {
      ...base,
      applicable: false,
      typed: false,
      invalid: false,
      multiplier,
      cents: null,
      needsRate: false,
    };
  }
  if (!field || field.raw.trim() === "") {
    return {
      ...base,
      applicable: true,
      typed: false,
      invalid: false,
      multiplier: 1,
      cents: null,
      needsRate: false,
    };
  }

  const parsed = parseAmount(field.raw);
  if (!parsed.ok) {
    return {
      ...base,
      applicable: true,
      typed: false,
      invalid: true,
      multiplier,
      cents: null,
      needsRate: false,
    };
  }

  const single = toUsdCents(parsed.amount, field.currency, context.rate);
  const parts = single === null ? [] : sharesOf(single, placements);
  return {
    ...base,
    applicable: true,
    typed: true,
    invalid: false,
    multiplier,
    cents: single === null ? null : headlineCents(parts),
    parts,
    needsRate: single === null,
  };
}

/** A box of the months alone: one person's monthly cost, counted once for every month until the family arrives. */
function computeAloneItem(
  def: ItemDef,
  field: AmountField | undefined,
  context: HouseholdContext,
): ItemResult {
  const months = context.followMonths;
  const base = { id: def.id, stage: "aloneMonths" as const, multiplier: months ?? 1, parts: [], cents: null };
  const empty = { ...base, typed: false, invalid: false, needsRate: false };
  if (months === null) return { ...empty, applicable: false };
  if (!field || field.raw.trim() === "") return { ...empty, applicable: true };

  const parsed = parseAmount(field.raw);
  if (!parsed.ok) return { ...empty, applicable: true, invalid: true };

  const single = toUsdCents(parsed.amount, field.currency, context.rate);
  const parts = single === null ? [] : sharesOf(single, [{ stage: "aloneMonths", multiplier: months }]);
  return {
    ...base,
    applicable: true,
    typed: true,
    invalid: false,
    cents: single,
    parts,
    needsRate: single === null,
  };
}

/** Converts one standalone field (income, savings) to cents; zero when empty. */
function standaloneCents(field: AmountField, rate: Rate | null): { cents: Cents; needsRate: boolean } {
  const parsed = parseAmount(field.raw);
  if (!parsed.ok) return { cents: ZERO_CENTS, needsRate: false };
  const cents = toUsdCents(parsed.amount, field.currency, rate);
  return cents === null ? { cents: ZERO_CENTS, needsRate: true } : { cents, needsRate: false };
}

/** Months the user wants as an emergency buffer; zero when empty or unreadable. */
function parseBufferMonths(raw: string): Decimal {
  const parsed = parseAmount(raw);
  return parsed.ok ? parsed.amount : { units: 0n, scale: 0 };
}

function sumCents(values: readonly (Cents | null)[]): Cents {
  return values.reduce<Cents>((total, value) => total + (value ?? ZERO_CENTS), ZERO_CENTS);
}

function computeStages(items: ItemResult[]): StageResult[] {
  return TIMELINE_STAGES.map((stage) => {
    const listed = items.filter((i) => i.stage === stage);
    return {
      stage,
      cents: sumCents(items.flatMap((i) => i.parts.filter((p) => p.stage === stage).map((p) => p.cents))),
      emptyIds: listed.filter((i) => i.applicable && !i.typed).map((i) => i.id),
      incomplete: listed.some((i) => i.needsRate),
    };
  });
}

/** The money timeline in order; the two stages of a family that follows later are left out otherwise. */
function computeTimeline(stages: StageResult[], isFollow: boolean): TimelineEntry[] {
  let running = ZERO_CENTS;
  return stages
    .filter((s) => isFollow || !FOLLOW_ONLY_STAGES.includes(s.stage))
    .map((s) => {
      running += s.cents;
      return { stage: s.stage, stageCents: s.cents, cumulativeCents: running };
    });
}

interface ScenarioInputs {
  oneTimeCents: Cents;
  monthlyCents: Cents;
  savingsCents: Cents;
  bufferMonths: Decimal;
  /** Set when the family follows later: the months are then priced phase by phase. */
  phases: FollowPhases | null;
}

/** The monthly costs of the months without income: the months until the job starts and the buffer after. */
function monthsCost(inputs: ScenarioInputs, startMonth: number): Cents {
  if (inputs.phases !== null) return costOfMonths(addMonths(inputs.bufferMonths, startMonth), inputs.phases);
  const buffer = isZero(inputs.bufferMonths)
    ? ZERO_CENTS
    : multiplyCents(inputs.monthlyCents, inputs.bufferMonths);
  return inputs.monthlyCents * BigInt(startMonth) + buffer;
}

function computeScenarios(inputs: ScenarioInputs): Scenario[] {
  return SCENARIO_START_MONTHS.map((startMonth) => {
    const requiredCents = inputs.oneTimeCents + monthsCost(inputs, startMonth) - inputs.savingsCents;
    return {
      startMonth,
      requiredCents,
      shortfallCents: requiredCents > ZERO_CENTS ? requiredCents : ZERO_CENTS,
      surplusCents: requiredCents < ZERO_CENTS ? -requiredCents : ZERO_CENTS,
    };
  });
}

/** The two phases of a family that follows later, from the stage totals; null when everyone travels together. */
function phasesOf(months: number | null, stageCents: (stage: TimelineStage) => Cents): FollowPhases | null {
  if (months === null) return null;
  return {
    months,
    aloneMonthlyCents: stageCents("aloneMonths") / BigInt(months),
    fullMonthlyCents: stageCents("monthly"),
  };
}

/** What is known when the family follows later; null when everyone travels together. */
function followResultOf(
  phases: FollowPhases | null,
  oneTimeCents: Cents,
  aloneMonthsCents: Cents,
): FollowResult | null {
  if (phases === null) return null;
  return {
    months: phases.months,
    aloneMonthlyCents: phases.aloneMonthlyCents,
    cashByArrivalCents: oneTimeCents + aloneMonthsCents,
  };
}

/** The household as the multipliers see it: the counts, the children by age, the rate and the phases. */
function contextOf(state: PlanState, rate: Rate | null, followMonths: number | null): HouseholdContext {
  const { adults, children, childAges } = state.household;
  return {
    adults,
    children,
    registrations: state.registrations,
    ages: ageGroups(childAges, children),
    rate,
    followMonths,
  };
}

export function computePlan(state: PlanState): PlanResult {
  const rate = parseRate(state.rate);
  const { adults, children } = state.household;
  const quick = state.uiMode === "quick";
  const defs = quick ? QUICK_ITEMS : ITEMS;
  const fields = quick ? state.quick : state.items;

  // The five quick boxes are whole-household totals, so they never split between two phases.
  const followMonths = quick ? null : followMonthsOf(state);
  const context = contextOf(state, rate, followMonths);
  const items = defs.map((def) => computeItem(def, fields[def.id], context));
  const aloneItems = ALONE_MONTHLY_ITEMS.map((def) =>
    computeAloneItem(def, state.aloneMonthly[def.id], context),
  );
  const stages = computeStages([...items, ...aloneItems]);
  const stageCents = (stage: TimelineStage) => stages.find((s) => s.stage === stage)?.cents ?? ZERO_CENTS;
  const oneTimeCents = sumCents(ONE_TIME_STAGES.map(stageCents));
  const monthlyCents = stageCents("monthly");
  const phases = phasesOf(followMonths, stageCents);

  const income = standaloneCents(state.income, rate);
  const spouse = standaloneCents(state.spouseIncome, rate);
  const savings = standaloneCents(state.savings, rate);
  const bufferMonths = parseBufferMonths(state.bufferMonths);

  return {
    rate,
    adults,
    children,
    persons: adults + children,
    items,
    aloneItems,
    agesUnknown: context.ages.unknown,
    coverage: coverageOf({
      savingsTyped: parseAmount(state.savings.raw).ok && !savings.needsRate,
      savingsCents: savings.cents,
      oneTimeCents,
      monthlyCents,
      phases,
    }),
    stages,
    timeline: computeTimeline(stages, phases !== null),
    oneTimeCents,
    monthlyCents,
    incomeCents: income.cents,
    spouseIncomeCents: spouse.cents,
    savingsCents: savings.cents,
    netMonthlyAfterStartCents: monthlyCents - income.cents - spouse.cents,
    scenarios: computeScenarios({
      oneTimeCents,
      monthlyCents,
      savingsCents: savings.cents,
      bufferMonths,
      phases,
    }),
    follow: followResultOf(phases, oneTimeCents, stageCents("aloneMonths")),
    needsRate:
      items.some((i) => i.needsRate) ||
      aloneItems.some((i) => i.needsRate) ||
      income.needsRate ||
      spouse.needsRate ||
      savings.needsRate,
  };
}

/** The same cents shown in the user's local currency at his own rate; null without a rate. */
export function localCents(usdCents: Cents, result: PlanResult): Cents | null {
  return usdCentsToLocalCents(usdCents, result.rate);
}
