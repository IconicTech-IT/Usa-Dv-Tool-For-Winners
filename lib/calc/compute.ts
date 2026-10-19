import { ITEMS, QUICK_ITEMS, STAGES, type ItemDef, type Scaling, type Stage } from "@/lib/calc/catalog";
import { parseRate, type Rate } from "@/lib/calc/currency";
import { isZero, type Decimal } from "@/lib/calc/decimal";
import { multiplyCents, toUsdCents, usdCentsToLocalCents, ZERO_CENTS, type Cents } from "@/lib/calc/money";
import type { AmountField, PlanState } from "@/lib/calc/model";
import { parseAmount } from "@/lib/calc/parse-amount";

/**
 * All the maths, in exact US cents (BigInt). Money amounts come only from what the user
 * typed; the only constants here are the formulas.
 *
 * Formulas (design note s2):
 *   stage total      = sum of its items, each multiplied by the household count when per person
 *   oneTime          = beforeEntry + beforeInterview + atInterview + beforeTravel + firstMonth
 *   monthly          = sum of the monthly items
 *   scenario n       = oneTime + monthly * n + bufferMonths * monthly - savings   (n = 0, 1, 2, 3)
 *   netMonthlyAfter  = monthly - income - spouseIncome   (negative means a monthly surplus)
 *   timeline         = running total over the stages in order; the "monthly" stage adds one month
 */

export const SCENARIO_START_MONTHS = [0, 1, 2, 3] as const;
export type ScenarioStart = (typeof SCENARIO_START_MONTHS)[number];

/** The stages that make up the one-time total (everything except the monthly costs). */
const ONE_TIME_STAGES: readonly Stage[] = [
  "beforeEntry",
  "beforeInterview",
  "atInterview",
  "beforeTravel",
  "firstMonth",
];

export interface ItemResult {
  id: string;
  stage: Stage;
  /** The user typed a valid amount (zero counts as typed). */
  typed: boolean;
  /** Text is there but is not a valid non-negative number. */
  invalid: boolean;
  multiplier: number;
  /** Amount in US cents after the multiplier; null when empty, invalid, or the rate is missing. */
  cents: Cents | null;
  /** Typed in the local currency but no valid rate was typed yet. */
  needsRate: boolean;
}

export interface StageResult {
  stage: Stage;
  cents: Cents;
  /** Ids of items nobody typed an amount for ("what did I forget"). */
  emptyIds: string[];
  /** Some typed amount could not be converted (missing rate). */
  incomplete: boolean;
}

export interface TimelineEntry {
  stage: Stage;
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

export interface PlanResult {
  rate: Rate | null;
  adults: number;
  children: number;
  persons: number;
  items: ItemResult[];
  stages: StageResult[];
  timeline: TimelineEntry[];
  oneTimeCents: Cents;
  monthlyCents: Cents;
  incomeCents: Cents;
  spouseIncomeCents: Cents;
  savingsCents: Cents;
  netMonthlyAfterStartCents: Cents;
  scenarios: Scenario[];
  /** A local-currency amount exists but no valid rate was typed, so totals are partial. */
  needsRate: boolean;
}

interface HouseholdContext {
  adults: number;
  children: number;
  rate: Rate | null;
}

function multiplierFor(scaling: Scaling, adults: number, children: number): number {
  switch (scaling) {
    case "total":
      return 1;
    case "perPerson":
      return adults + children;
    case "perAdult":
      return adults;
    case "perChild":
      return children;
  }
}

function effectiveScaling(def: ItemDef, field: AmountField): Scaling {
  if (def.toggle) return field.perPerson ? "perPerson" : "total";
  return def.scaling;
}

function computeItem(def: ItemDef, field: AmountField | undefined, context: HouseholdContext): ItemResult {
  const base = { id: def.id, stage: def.stage };
  if (!field || field.raw.trim() === "") {
    return { ...base, typed: false, invalid: false, multiplier: 1, cents: null, needsRate: false };
  }

  const parsed = parseAmount(field.raw);
  const multiplier = multiplierFor(effectiveScaling(def, field), context.adults, context.children);
  if (!parsed.ok) {
    return { ...base, typed: false, invalid: true, multiplier, cents: null, needsRate: false };
  }

  const single = toUsdCents(parsed.amount, field.currency, context.rate);
  return {
    ...base,
    typed: true,
    invalid: false,
    multiplier,
    cents: single === null ? null : single * BigInt(multiplier),
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
  return STAGES.map((stage) => {
    const stageItems = items.filter((i) => i.stage === stage);
    return {
      stage,
      cents: sumCents(stageItems.map((i) => i.cents)),
      emptyIds: stageItems.filter((i) => !i.typed).map((i) => i.id),
      incomplete: stageItems.some((i) => i.needsRate),
    };
  });
}

function computeTimeline(stages: StageResult[]): TimelineEntry[] {
  let running = ZERO_CENTS;
  return stages.map((s) => {
    running += s.cents;
    return { stage: s.stage, stageCents: s.cents, cumulativeCents: running };
  });
}

interface ScenarioInputs {
  oneTimeCents: Cents;
  monthlyCents: Cents;
  savingsCents: Cents;
  bufferMonths: Decimal;
}

function computeScenarios(inputs: ScenarioInputs): Scenario[] {
  const buffer = isZero(inputs.bufferMonths)
    ? ZERO_CENTS
    : multiplyCents(inputs.monthlyCents, inputs.bufferMonths);
  return SCENARIO_START_MONTHS.map((startMonth) => {
    const requiredCents =
      inputs.oneTimeCents + inputs.monthlyCents * BigInt(startMonth) + buffer - inputs.savingsCents;
    return {
      startMonth,
      requiredCents,
      shortfallCents: requiredCents > ZERO_CENTS ? requiredCents : ZERO_CENTS,
      surplusCents: requiredCents < ZERO_CENTS ? -requiredCents : ZERO_CENTS,
    };
  });
}

export function computePlan(state: PlanState): PlanResult {
  const rate = parseRate(state.rate);
  const { adults, children } = state.household;
  const quick = state.uiMode === "quick";
  const defs = quick ? QUICK_ITEMS : ITEMS;
  const fields = quick ? state.quick : state.items;

  const items = defs.map((def) => computeItem(def, fields[def.id], { adults, children, rate }));
  const stages = computeStages(items);
  const stageCents = (stage: Stage) => stages.find((s) => s.stage === stage)?.cents ?? ZERO_CENTS;
  const oneTimeCents = sumCents(ONE_TIME_STAGES.map(stageCents));
  const monthlyCents = stageCents("monthly");

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
    stages,
    timeline: computeTimeline(stages),
    oneTimeCents,
    monthlyCents,
    incomeCents: income.cents,
    spouseIncomeCents: spouse.cents,
    savingsCents: savings.cents,
    netMonthlyAfterStartCents: monthlyCents - income.cents - spouse.cents,
    scenarios: computeScenarios({ oneTimeCents, monthlyCents, savingsCents: savings.cents, bufferMonths }),
    needsRate: items.some((i) => i.needsRate) || income.needsRate || spouse.needsRate || savings.needsRate,
  };
}

/** The same cents shown in the user's local currency at his own rate; null without a rate. */
export function localCents(usdCents: Cents, result: PlanResult): Cents | null {
  return usdCentsToLocalCents(usdCents, result.rate);
}
