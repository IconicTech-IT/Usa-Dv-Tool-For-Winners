import { emptyPlan, PlanStateSchema, type PlanState } from "@/lib/calc/model";
import { normalizePlan } from "@/lib/calc/plan-file";

/** Keeps the plan on the user's device only (local storage). Never throws. */

export const STORAGE_KEY = "dv-compass:plan:v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // private mode or blocked storage
  }
}

export function loadPlan(storage: StorageLike | null = defaultStorage()): PlanState {
  if (!storage) return emptyPlan();
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (text === null) return emptyPlan();
    const parsed = PlanStateSchema.safeParse(JSON.parse(text));
    return parsed.success ? normalizePlan(parsed.data) : emptyPlan();
  } catch {
    return emptyPlan();
  }
}

/** Returns true when the plan was stored. */
export function savePlan(state: PlanState, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false; // quota exceeded or blocked
  }
}

export function clearPlan(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // nothing to do
  }
}
