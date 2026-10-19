import { libraryOf, LibrarySchema, type Library } from "@/lib/calc/library";
import { emptyPlan, PlanStateSchema, type PlanState } from "@/lib/calc/model";
import { normalizePlan } from "@/lib/calc/plan-file";

/** Keeps the plan on the user's device only (local storage). Never throws. */

/** The single plan of the first version of the site. Read once and moved into the list of plans. */
export const STORAGE_KEY = "dv-compass:plan:v1";
/** The list of named plans. */
export const LIBRARY_KEY = "dv-compass:plans:v1";

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

/** Makes sure every plan in the list has every current box. */
function normalizeLibrary(library: Library): Library {
  return { ...library, plans: library.plans.map((entry) => ({ ...entry, plan: normalizePlan(entry.plan) })) };
}

/**
 * The plans of this device. A device that has only the old single plan gets it as the first plan of
 * a new list (the old copy is removed once the list is written); a broken list starts a new one.
 */
export function loadLibrary(
  storage: StorageLike | null = defaultStorage(),
  newId: () => string = () => "plan-1",
  now: Date = new Date(),
): Library {
  if (!storage) return libraryOf(emptyPlan(), newId(), now);
  try {
    const text = storage.getItem(LIBRARY_KEY);
    if (text !== null) {
      const parsed = LibrarySchema.safeParse(JSON.parse(text));
      if (parsed.success) return normalizeLibrary(parsed.data);
    }
  } catch {
    // fall through to the old plan or a new list
  }
  const migrated = libraryOf(loadPlan(storage), newId(), now);
  if (saveLibrary(migrated, storage)) removeOldPlan(storage);
  return migrated;
}

function removeOldPlan(storage: StorageLike): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // the old copy stays; it is ignored once the list exists
  }
}

/** Returns true when the list was stored. */
export function saveLibrary(library: Library, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(LIBRARY_KEY, JSON.stringify(library));
    return true;
  } catch {
    return false; // quota exceeded or blocked
  }
}

export function clearLibrary(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(LIBRARY_KEY);
  } catch {
    // nothing to do
  }
}
