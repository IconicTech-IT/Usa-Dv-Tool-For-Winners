import { z } from "zod";

import { ITEMS, QUICK_ITEMS } from "@/lib/calc/catalog";
import { DEFAULT_LOCAL_CURRENCY } from "@/lib/calc/currency";

/**
 * The saved state of one plan. Everything is a string the user typed (raw),
 * parsed only when computing, so the input box can show exactly what he typed.
 */

export const PLAN_VERSION = 1 as const;

export const MAX_RAW_LENGTH = 40;
export const MAX_CHILDREN = 20;
export const MAX_ADULTS = 10;
export const MAX_REGISTRATIONS = 10;
export const MAX_NAME_LENGTH = 60;
/** The most months the family may arrive after the principal. */
export const MAX_FOLLOW_MONTHS = 24;
/**
 * A visa is usually valid for about six months from the date it is printed (Cairo supplement); the setup
 * page warns when the family would arrive later. The warning never blocks anything.
 */
export const VISA_VALIDITY_MONTHS = 6;

/**
 * The only amount a new plan starts with: the official registration fee, set by the State
 * Department's final rule of 16 September 2025 (Federal Register 2025-17851). The user may change it.
 */
export const REGISTRATION_FEE_PREFILL = "1";
export const REGISTRATION_FEE_ITEM = "registrationFee";

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

/**
 * How the household travels: all together, or the principal first and the family a number of months later.
 * The months stay as typed (a string) like every other box; the choice only counts when there is a family.
 */
export const TravelSchema = z.object({
  mode: z.enum(["together", "follow"]),
  followMonths: z.string().max(MAX_RAW_LENGTH),
});
export type Travel = z.infer<typeof TravelSchema>;

export const TOGETHER: Travel = { mode: "together", followMonths: "" };

export const PlanStateSchema = z.object({
  version: z.literal(PLAN_VERSION),
  /** The name the person gave this plan ("Texas, alone"); empty until he types one. */
  name: z.string().max(MAX_NAME_LENGTH).default(""),
  uiMode: z.enum(["quick", "detailed"]),
  household: HouseholdSchema,
  /** Plans saved before this choice existed travel all together. */
  travel: TravelSchema.default(TOGETHER),
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
  /** How many entries are made: one, or two when the spouse also enters on his or her own. */
  registrations: z.number().int().min(1).max(MAX_REGISTRATIONS).default(1),
});
export type PlanState = z.infer<typeof PlanStateSchema>;

export function emptyField(): AmountField {
  return { raw: "", currency: "usd" };
}

/** A box as a new plan has it: empty, except the registration fee which holds the official fee. */
export function defaultField(id: string): AmountField {
  return id === REGISTRATION_FEE_ITEM ? { raw: REGISTRATION_FEE_PREFILL, currency: "usd" } : emptyField();
}

export function emptyPlan(): PlanState {
  const items: Record<string, AmountField> = {};
  for (const def of ITEMS) items[def.id] = defaultField(def.id);
  const quick: Record<string, AmountField> = {};
  for (const def of QUICK_ITEMS) quick[def.id] = emptyField();

  return {
    version: PLAN_VERSION,
    name: "",
    uiMode: "detailed",
    household: { adults: 1, children: 0, childAges: [] },
    travel: TOGETHER,
    localCurrency: DEFAULT_LOCAL_CURRENCY,
    rate: "",
    items,
    quick,
    income: emptyField(),
    spouseIncome: emptyField(),
    savings: emptyField(),
    bufferMonths: "",
    registrations: 1,
  };
}

/** Keeps the children count and the ages list in step. */
export function withChildren(household: Household, children: number): Household {
  const count = Math.max(0, Math.min(MAX_CHILDREN, Math.trunc(children)));
  const childAges = Array.from({ length: count }, (_, i) => household.childAges[i] ?? "");
  return { ...household, children: count, childAges };
}
