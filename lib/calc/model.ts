import { z } from "zod";

import { ITEMS, QUICK_ITEMS } from "@/lib/calc/catalog";
import { DEFAULT_LOCAL_CURRENCY } from "@/lib/calc/currency";

/**
 * The saved state of one plan. Everything is a string the user typed (raw),
 * parsed only when computing, so the input box can show exactly what he typed.
 */

export const PLAN_VERSION = 1 as const;

const MAX_RAW_LENGTH = 40;
const MAX_CHILDREN = 20;
const MAX_ADULTS = 10;

export const AmountFieldSchema = z.object({
  raw: z.string().max(MAX_RAW_LENGTH),
  currency: z.enum(["usd", "local"]),
  /** Only used by items that may switch between "whole household" and "per person". */
  perPerson: z.boolean().optional(),
});
export type AmountField = z.infer<typeof AmountFieldSchema>;

export const HouseholdSchema = z.object({
  adults: z.number().int().min(1).max(MAX_ADULTS),
  children: z.number().int().min(0).max(MAX_CHILDREN),
  /** Optional ages, one raw string per child; empty means not given. */
  childAges: z.array(z.string().max(MAX_RAW_LENGTH)).max(MAX_CHILDREN),
});
export type Household = z.infer<typeof HouseholdSchema>;

export const PlanStateSchema = z.object({
  version: z.literal(PLAN_VERSION),
  uiMode: z.enum(["quick", "detailed"]),
  household: HouseholdSchema,
  /** ISO 4217 code of the user's local currency. */
  localCurrency: z.string().regex(/^[A-Z]{3}$/),
  /** Local units per one US dollar, typed by the user; empty until he types it. */
  rate: z.string().max(MAX_RAW_LENGTH),
  items: z.record(z.string().max(60), AmountFieldSchema),
  quick: z.record(z.string().max(60), AmountFieldSchema),
  income: AmountFieldSchema,
  spouseIncome: AmountFieldSchema,
  savings: AmountFieldSchema,
  /** Emergency buffer in months, typed by the user. */
  bufferMonths: z.string().max(MAX_RAW_LENGTH),
});
export type PlanState = z.infer<typeof PlanStateSchema>;

export function emptyField(): AmountField {
  return { raw: "", currency: "usd" };
}

export function emptyPlan(): PlanState {
  const items: Record<string, AmountField> = {};
  for (const def of ITEMS) items[def.id] = emptyField();
  const quick: Record<string, AmountField> = {};
  for (const def of QUICK_ITEMS) quick[def.id] = emptyField();

  return {
    version: PLAN_VERSION,
    uiMode: "detailed",
    household: { adults: 1, children: 0, childAges: [] },
    localCurrency: DEFAULT_LOCAL_CURRENCY,
    rate: "",
    items,
    quick,
    income: emptyField(),
    spouseIncome: emptyField(),
    savings: emptyField(),
    bufferMonths: "",
  };
}

/** Keeps the children count and the ages list in step. */
export function withChildren(household: Household, children: number): Household {
  const count = Math.max(0, Math.min(MAX_CHILDREN, Math.trunc(children)));
  const childAges = Array.from({ length: count }, (_, i) => household.childAges[i] ?? "");
  return { ...household, children: count, childAges };
}
