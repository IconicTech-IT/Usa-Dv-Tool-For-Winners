import { ITEMS, QUICK_ITEMS } from "@/lib/calc/catalog";
import {
  defaultField,
  PLAN_VERSION,
  PlanStateSchema,
  type AmountField,
  type PlanState,
} from "@/lib/calc/model";

/**
 * Save and open a plan as a file (a JSON download and upload). No account, nothing
 * sent anywhere. The file holds only what the user typed.
 */

export const PLAN_FILE_FORMAT = "dv-compass-plan";
export const MAX_PLAN_FILE_CHARS = 200_000;

export type OpenFailure = "too-large" | "not-json" | "wrong-format" | "invalid";

export type OpenResult = { ok: true; state: PlanState } | { ok: false; reason: OpenFailure };

export function serializePlan(state: PlanState, now: Date = new Date()): string {
  return JSON.stringify(
    { format: PLAN_FILE_FORMAT, version: PLAN_VERSION, savedAt: now.toISOString(), state },
    null,
    2,
  );
}

/** A suggested download name such as dv-compass-plan-2026-10-19.json. */
export function planFileName(now: Date = new Date()): string {
  return `dv-compass-plan-${now.toISOString().slice(0, 10)}.json`;
}

function fillFields(
  known: readonly { id: string }[],
  saved: Record<string, AmountField>,
): Record<string, AmountField> {
  const out: Record<string, AmountField> = {};
  for (const def of known) out[def.id] = saved[def.id] ?? defaultField(def.id);
  return out;
}

/** Makes sure every current item has a field and drops unknown ones. */
export function normalizePlan(state: PlanState): PlanState {
  return {
    ...state,
    items: fillFields(ITEMS, state.items),
    quick: fillFields(QUICK_ITEMS, state.quick),
    household: {
      ...state.household,
      childAges: Array.from(
        { length: state.household.children },
        (_, i) => state.household.childAges[i] ?? "",
      ),
    },
  };
}

export function parsePlanFile(text: string): OpenResult {
  if (text.length > MAX_PLAN_FILE_CHARS) return { ok: false, reason: "too-large" };

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: "not-json" };
  }

  if (
    typeof data !== "object" ||
    data === null ||
    (data as { format?: unknown }).format !== PLAN_FILE_FORMAT
  ) {
    return { ok: false, reason: "wrong-format" };
  }

  const parsed = PlanStateSchema.safeParse((data as { state?: unknown }).state);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  return { ok: true, state: normalizePlan(parsed.data) };
}
