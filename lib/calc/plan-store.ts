import { emptyPlan, type PlanState } from "@/lib/calc/model";
import {
  patchItem,
  patchQuick,
  patchTopField,
  setAdults,
  setBufferMonths,
  setChildAge,
  setChildren,
  setRegistrations,
  setLocalCurrency,
  setRate,
  setUiMode,
  type FieldPatch,
  type TopField,
} from "@/lib/calc/plan-actions";
import {
  clearPlan,
  defaultStorage,
  loadPlan,
  savePlan,
  STORAGE_KEY,
  type StorageLike,
} from "@/lib/calc/storage";

/**
 * One store for the plan, kept on this device only. It is shaped for
 * React's useSyncExternalStore: snapshots are stable objects that change only when
 * the plan changes.
 *
 *   - The server and the first client render use the empty plan, so the markup matches.
 *   - Every change is saved at once; `saved` is false when the browser blocks storage.
 *   - A change made in another tab of the same browser is picked up.
 */

export interface PlanSnapshot {
  plan: PlanState;
  /** False when the last change could not be written to the device (storage blocked or full). */
  saved: boolean;
}

/** Calls the listener when another tab changes the stored plan; returns a stop function. */
export type StorageWatcher = (listener: (event: { key: string | null }) => void) => () => void;

export interface PlanStoreOptions {
  /** Where to keep the plan. Default: this browser's local storage (none on the server). */
  storage?: StorageLike | null;
  /** How to hear about changes from other tabs. Default: the window "storage" event. */
  watch?: StorageWatcher | null;
}

function defaultWatcher(): StorageWatcher | null {
  if (typeof window === "undefined") return null;
  return (listener) => {
    const handler = (event: StorageEvent) => listener({ key: event.key });
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  };
}

export interface PlanActions {
  setItem: (id: string, patch: FieldPatch) => void;
  setQuick: (id: string, patch: FieldPatch) => void;
  setTopField: (key: TopField, patch: FieldPatch) => void;
  setAdults: (adults: number) => void;
  setChildren: (children: number) => void;
  setRegistrations: (registrations: number) => void;
  setChildAge: (index: number, raw: string) => void;
  setLocalCurrency: (code: string) => void;
  setRate: (raw: string) => void;
  setBufferMonths: (raw: string) => void;
  setUiMode: (mode: PlanState["uiMode"]) => void;
  /** Replace everything, for example after opening a saved plan file. */
  replace: (plan: PlanState) => void;
  /** Forget everything on this device. */
  reset: () => void;
}

/** Function-typed fields (not methods) so they can be passed to React without losing `this`. */
export interface PlanStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => PlanSnapshot;
  getServerSnapshot: () => PlanSnapshot;
  actions: PlanActions;
}

const SERVER_SNAPSHOT: PlanSnapshot = { plan: emptyPlan(), saved: true };

export function createPlanStore(options: PlanStoreOptions = {}): PlanStore {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const watch = options.watch === undefined ? defaultWatcher() : options.watch;

  let snapshot: PlanSnapshot | null = null;
  const listeners = new Set<() => void>();
  let stopWatching: (() => void) | null = null;

  function read(): PlanSnapshot {
    if (snapshot === null) snapshot = { plan: loadPlan(storage), saved: true };
    return snapshot;
  }

  function emit(): void {
    for (const listener of [...listeners]) listener();
  }

  function commit(next: PlanState): void {
    if (next === read().plan) return;
    snapshot = { plan: next, saved: savePlan(next, storage) };
    emit();
  }

  function update(change: (state: PlanState) => PlanState): void {
    commit(change(read().plan));
  }

  function onOtherTab(event: { key: string | null }): void {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    snapshot = { plan: loadPlan(storage), saved: true };
    emit();
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    if (listeners.size === 1 && watch) stopWatching = watch(onOtherTab);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && stopWatching) {
        stopWatching();
        stopWatching = null;
      }
    };
  }

  const actions: PlanActions = {
    setItem: (id, patch) => update((s) => patchItem(s, id, patch)),
    setQuick: (id, patch) => update((s) => patchQuick(s, id, patch)),
    setTopField: (key, patch) => update((s) => patchTopField(s, key, patch)),
    setAdults: (adults) => update((s) => setAdults(s, adults)),
    setChildren: (children) => update((s) => setChildren(s, children)),
    setRegistrations: (registrations) => update((s) => setRegistrations(s, registrations)),
    setChildAge: (index, raw) => update((s) => setChildAge(s, index, raw)),
    setLocalCurrency: (code) => update((s) => setLocalCurrency(s, code)),
    setRate: (raw) => update((s) => setRate(s, raw)),
    setBufferMonths: (raw) => update((s) => setBufferMonths(s, raw)),
    setUiMode: (mode) => update((s) => setUiMode(s, mode)),
    replace: (plan) => commit(plan),
    reset: () => {
      clearPlan(storage);
      snapshot = { plan: emptyPlan(), saved: true };
      emit();
    },
  };

  return { subscribe, getSnapshot: read, getServerSnapshot: () => SERVER_SNAPSHOT, actions };
}

/** The store the whole site shares. */
export const planStore: PlanStore = createPlanStore();
