import { ITEMS, QUICK_ITEMS, STAGES, type ItemDef, type Scaling, type Stage } from "@/lib/calc/catalog";
import { parseRate, toUsd, usdToLocal } from "@/lib/calc/currency";
import type { AmountField, PlanState } from "@/lib/calc/model";
import { parseAmount } from "@/lib/calc/parse-amount";

/**
 * All the maths. Money amounts come only from what the user typed; the only
 * constants here are the formulas.
 *
 * Formulas (design note s2):
 *   stage total      = sum of its items, each multiplied by the household count when per person
 *   oneTime          = beforeInterview + atInterview + beforeTravel + firstMonth
 *   monthly          = sum of the monthly items
 *   scenario n       = oneTime + monthly * n + bufferMonths * monthly - savings   (n = 0, 1, 2, 3)
 *   netMonthlyAfter  = monthly - income - spouseIncome   (negative means a monthly surplus)
 *   timeline         = running total over the stages in order; the "monthly" stage adds one month
 */

export const SCENARIO_START_MONTHS = [0, 1, 2, 3] as const;
export type ScenarioStart = (typeof SCENARIO_START_MONTHS)[number];

export interface ItemResult {
  id: string;
  stage: Stage;
  /** The user typed a valid amount (zero counts as typed). */
  typed: boolean;
  /** Text is there but is not a valid non-negative number. */
  invalid: boolean;
  multiplier: number;
  /** Amount in US dollars after the multiplier; null when empty, invalid, or the rate is missing. */
  usd: number | null;
  /** Typed in the local currency but no valid rate was typed yet. */
  needsRate: boolean;
}

export interface StageResult {
  stage: Stage;
  usd: number;
  /** Ids of items nobody typed an amount for ("what did I forget"). */
  emptyIds: string[];
  /** Some typed amount could not be converted (missing rate). */
  incomplete: boolean;
}

export interface TimelineEntry {
  stage: Stage;
  stageUsd: number;
  cumulativeUsd: number;
}

export interface Scenario {
  startMonth: ScenarioStart;
  requiredUsd: number;
  /** requiredUsd when positive, else 0. */
  shortfallUsd: number;
  /** -requiredUsd when requiredUsd is negative, else 0. */
  surplusUsd: number;
}

export interface PlanResult {
  rate: number | null;
  adults: number;
  children: number;
  persons: number;
  items: ItemResult[];
  stages: StageResult[];
  timeline: TimelineEntry[];
  oneTimeUsd: number;
  monthlyUsd: number;
  incomeUsd: number;
  spouseIncomeUsd: number;
  savingsUsd: number;
  bufferMonths: number;
  netMonthlyAfterStartUsd: number;
  scenarios: Scenario[];
  /** A local-currency amount exists but no valid rate was typed, so totals are partial. */
  needsRate: boolean;
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

function computeItem(
  def: ItemDef,
  field: AmountField | undefined,
  adults: number,
  children: number,
  rate: number | null,
): ItemResult {
  const base = { id: def.id, stage: def.stage };
  const empty = !field || field.raw.trim() === "";
  if (!field || empty) {
    return { ...base, typed: false, invalid: false, multiplier: 1, usd: null, needsRate: false };
  }

  const parsed = parseAmount(field.raw);
  const multiplier = multiplierFor(effectiveScaling(def, field), adults, children);
  if (!parsed.ok) {
    return { ...base, typed: false, invalid: true, multiplier, usd: null, needsRate: false };
  }

  const usd = toUsd(parsed.value, field.currency, rate);
  return {
    ...base,
    typed: true,
    invalid: false,
    multiplier,
    usd: usd === null ? null : usd * multiplier,
    needsRate: usd === null,
  };
}

/** Converts one standalone field (income, savings) to dollars; zero when empty. */
function standaloneUsd(field: AmountField, rate: number | null): { usd: number; needsRate: boolean } {
  const parsed = parseAmount(field.raw);
  if (!parsed.ok) return { usd: 0, needsRate: false };
  const usd = toUsd(parsed.value, field.currency, rate);
  return usd === null ? { usd: 0, needsRate: true } : { usd, needsRate: false };
}

function parseBufferMonths(raw: string): number {
  const parsed = parseAmount(raw);
  return parsed.ok ? parsed.value : 0;
}

function sumStage(items: ItemResult[], stage: Stage): number {
  return items
    .filter((i) => i.stage === stage)
    .reduce((total, i) => total + (i.usd ?? 0), 0);
}

export function computePlan(state: PlanState): PlanResult {
  const rate = parseRate(state.rate);
  const { adults, children } = state.household;
  const quick = state.uiMode === "quick";
  const defs = quick ? QUICK_ITEMS : ITEMS;
  const fields = quick ? state.quick : state.items;

  const items = defs.map((def) => computeItem(def, fields[def.id], adults, children, rate));

  const stages: StageResult[] = STAGES.map((stage) => {
    const stageItems = items.filter((i) => i.stage === stage);
    return {
      stage,
      usd: sumStage(items, stage),
      emptyIds: stageItems.filter((i) => !i.typed).map((i) => i.id),
      incomplete: stageItems.some((i) => i.needsRate),
    };
  });

  const stageUsd = (stage: Stage) => stages.find((s) => s.stage === stage)?.usd ?? 0;
  const oneTimeUsd =
    stageUsd("beforeInterview") + stageUsd("atInterview") + stageUsd("beforeTravel") + stageUsd("firstMonth");
  const monthlyUsd = stageUsd("monthly");

  let running = 0;
  const timeline: TimelineEntry[] = stages.map((s) => {
    running += s.usd;
    return { stage: s.stage, stageUsd: s.usd, cumulativeUsd: running };
  });

  const income = standaloneUsd(state.income, rate);
  const spouse = standaloneUsd(state.spouseIncome, rate);
  const savings = standaloneUsd(state.savings, rate);
  const bufferMonths = parseBufferMonths(state.bufferMonths);

  const scenarios: Scenario[] = SCENARIO_START_MONTHS.map((startMonth) => {
    const requiredUsd = oneTimeUsd + monthlyUsd * startMonth + bufferMonths * monthlyUsd - savings.usd;
    return {
      startMonth,
      requiredUsd,
      shortfallUsd: Math.max(0, requiredUsd),
      surplusUsd: Math.max(0, -requiredUsd),
    };
  });

  return {
    rate,
    adults,
    children,
    persons: adults + children,
    items,
    stages,
    timeline,
    oneTimeUsd,
    monthlyUsd,
    incomeUsd: income.usd,
    spouseIncomeUsd: spouse.usd,
    savingsUsd: savings.usd,
    bufferMonths,
    netMonthlyAfterStartUsd: monthlyUsd - income.usd - spouse.usd,
    scenarios,
    needsRate: items.some((i) => i.needsRate) || income.needsRate || spouse.needsRate || savings.needsRate,
  };
}

/** The same dollars shown in the user's local currency at his own rate; null without a rate. */
export function localAmount(usd: number, result: PlanResult): number | null {
  return usdToLocal(usd, result.rate);
}
