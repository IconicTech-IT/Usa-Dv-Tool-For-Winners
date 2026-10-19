import {
  findItem,
  type Calculator,
  type GroupDef,
  type GroupId,
  type TimelineStage,
} from "@/lib/calc/catalog";
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

/** The cards whose total, when the family follows later, is the money of their own stage. */
const STAGE_CARDS: readonly GroupId[] = ["travel", "arrivalAlone", "arrivalFamily"];

/** The money of some items that falls in one stage of the timeline. */
function subtotalOfStage(result: PlanResult, itemIds: readonly string[], stage: TimelineStage): Subtotal {
  const ids = new Set(itemIds);
  let cents = ZERO_CENTS;
  let incomplete = false;
  let hasTyped = false;
  for (const item of result.items) {
    if (!ids.has(item.id)) continue;
    for (const part of item.parts) if (part.stage === stage) cents += part.cents;
    if (item.needsRate) incomplete = true;
    if (item.typed) hasTyped = true;
  }
  return { cents, incomplete, hasTyped };
}

/**
 * The total on a group card. When the family follows later, the travel card shows what is due at
 * departure, and each arrival card shows everything due at its stage (the family's tickets included).
 */
export function groupSubtotal(result: PlanResult, group: GroupDef): Subtotal {
  const ids = group.items.map((item) => item.id);
  if (result.follow === null || !STAGE_CARDS.includes(group.id)) return subtotalOf(result, ids);
  const stageIds =
    group.id === "travel"
      ? ids
      : result.items.filter((item) => findItem(item.id)?.calculator === "moving").map((item) => item.id);
  return subtotalOfStage(result, stageIds, group.stage);
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
  stage: TimelineStage;
  /** Ids of the boxes nobody typed an amount into. */
  itemIds: string[];
}

/** The stages that still have empty boxes, for the "what did I forget?" list. */
export function forgottenByStage(result: PlanResult): ForgottenStage[] {
  return result.stages
    .filter((stage) => stage.emptyIds.length > 0)
    .map((stage) => ({ stage: stage.stage, itemIds: stage.emptyIds }));
}

/** One stage of the plan for printing: the boxes with an amount that fall in it, and the stage total. */
export interface StageSection {
  stage: TimelineStage;
  cents: Cents;
  rows: { id: string; multiplier: number; cents: Cents }[];
}

/** The stages of the timeline that have typed amounts, each with its boxes in the order of the catalog. */
export function stageSections(result: PlanResult): StageSection[] {
  return result.timeline
    .map((entry) => ({
      stage: entry.stage,
      cents: entry.stageCents,
      rows: result.items.flatMap((item) =>
        item.typed
          ? item.parts
              .filter((part) => part.stage === entry.stage)
              .map((part) => ({ id: item.id, multiplier: part.multiplier, cents: part.cents }))
          : [],
      ),
    }))
    .filter((section) => section.rows.length > 0);
}

/** The message key of a timeline stage: the first month reads "when you arrive alone" when the family follows later. */
export function timelineKeyOf(stage: TimelineStage, followsLater: boolean): string {
  return followsLater && stage === "firstMonth" ? "firstMonthAlone" : stage;
}

/** A link that opens WhatsApp with the text ready; the person chooses who gets it. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
