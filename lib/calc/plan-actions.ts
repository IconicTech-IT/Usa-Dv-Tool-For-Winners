import { ITEMS, QUICK_ITEMS } from "@/lib/calc/catalog";
import { isValidCurrencyCode } from "@/lib/calc/currency";
import { MAX_ADULTS, MAX_RAW_LENGTH, withChildren, type AmountField, type PlanState } from "@/lib/calc/model";

/**
 * Pure changes to a plan. Each function returns the SAME state object when nothing
 * really changed, so a store can skip saving and re-rendering.
 *
 * Text is cut to the schema limit: a longer value would make the saved plan fail
 * validation on the next load and the user would lose everything he typed.
 */

export type FieldPatch = Partial<Pick<AmountField, "raw" | "currency" | "perPerson">>;
export type TopField = "income" | "spouseIncome" | "savings";

const ITEM_IDS: ReadonlySet<string> = new Set(ITEMS.map((i) => i.id));
const QUICK_IDS: ReadonlySet<string> = new Set(QUICK_ITEMS.map((i) => i.id));

function clampRaw(raw: string): string {
  return raw.length > MAX_RAW_LENGTH ? raw.slice(0, MAX_RAW_LENGTH) : raw;
}

function patchField(field: AmountField, patch: FieldPatch): AmountField {
  let next = field;
  if (typeof patch.raw === "string") {
    const raw = clampRaw(patch.raw);
    if (raw !== next.raw) next = { ...next, raw };
  }
  if (patch.currency === "usd" || patch.currency === "local") {
    if (patch.currency !== next.currency) next = { ...next, currency: patch.currency };
  }
  if (typeof patch.perPerson === "boolean" && patch.perPerson !== next.perPerson) {
    next = { ...next, perPerson: patch.perPerson };
  }
  return next;
}

export function patchItem(state: PlanState, id: string, patch: FieldPatch): PlanState {
  if (!ITEM_IDS.has(id)) return state;
  const current = state.items[id];
  if (!current) return state;
  const next = patchField(current, patch);
  return next === current ? state : { ...state, items: { ...state.items, [id]: next } };
}

export function patchQuick(state: PlanState, id: string, patch: FieldPatch): PlanState {
  if (!QUICK_IDS.has(id)) return state;
  const current = state.quick[id];
  if (!current) return state;
  const next = patchField(current, patch);
  return next === current ? state : { ...state, quick: { ...state.quick, [id]: next } };
}

export function patchTopField(state: PlanState, key: TopField, patch: FieldPatch): PlanState {
  const current = state[key];
  const next = patchField(current, patch);
  return next === current ? state : { ...state, [key]: next };
}

export function setAdults(state: PlanState, adults: number): PlanState {
  if (!Number.isFinite(adults)) return state;
  const count = Math.max(1, Math.min(MAX_ADULTS, Math.trunc(adults)));
  if (count === state.household.adults) return state;
  return { ...state, household: { ...state.household, adults: count } };
}

export function setChildren(state: PlanState, children: number): PlanState {
  if (!Number.isFinite(children)) return state;
  const household = withChildren(state.household, children);
  if (household.children === state.household.children) return state;
  return { ...state, household };
}

export function setChildAge(state: PlanState, index: number, raw: string): PlanState {
  if (!Number.isInteger(index) || index < 0 || index >= state.household.children) return state;
  const age = clampRaw(raw);
  if (state.household.childAges[index] === age) return state;
  const childAges = state.household.childAges.slice();
  childAges[index] = age;
  return { ...state, household: { ...state.household, childAges } };
}

export function setLocalCurrency(state: PlanState, code: string): PlanState {
  if (!isValidCurrencyCode(code) || code === state.localCurrency) return state;
  return { ...state, localCurrency: code };
}

export function setRate(state: PlanState, raw: string): PlanState {
  const rate = clampRaw(raw);
  return rate === state.rate ? state : { ...state, rate };
}

export function setBufferMonths(state: PlanState, raw: string): PlanState {
  const bufferMonths = clampRaw(raw);
  return bufferMonths === state.bufferMonths ? state : { ...state, bufferMonths };
}

export function setUiMode(state: PlanState, mode: PlanState["uiMode"]): PlanState {
  if ((mode !== "quick" && mode !== "detailed") || mode === state.uiMode) return state;
  return { ...state, uiMode: mode };
}
