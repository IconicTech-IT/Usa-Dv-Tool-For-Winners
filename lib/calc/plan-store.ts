import {
  activeEntry,
  addPlan,
  duplicatePlan,
  openPlan,
  removePlan,
  renamePlan,
  withActivePlan,
  type Library,
} from "@/lib/calc/library";
import { emptyPlan, type PlanState } from "@/lib/calc/model";
import {
  patchAloneMonthly,
  patchItem,
  patchQuick,
  patchTopField,
  setAdults,
  setBufferMonths,
  setChildAge,
  setChildren,
  setRegistrations,
  setFollowMonths,
  setLocalCurrency,
  setRate,
  setTravelMode,
  setUiMode,
  type FieldPatch,
  type TopField,
} from "@/lib/calc/plan-actions";
import { defaultStorage, LIBRARY_KEY, loadLibrary, saveLibrary, type StorageLike } from "@/lib/calc/storage";

/**
 * One store for the plans, kept on this device only. It is shaped for React's
 * useSyncExternalStore: snapshots are stable objects that change only when a plan changes.
 *
 *   - The server and the first client render use one empty plan, so the markup matches.
 *   - Every change is saved at once; `saved` is false when the browser blocks storage.
 *   - A change made in another tab of the same browser is picked up.
 *   - Several named plans are kept; one is active and is the one the calculators edit.
 */

/** What the list of plans shows for each plan. */
export interface PlanListItem {
  id: string;
  name: string;
  updatedAt: string;
}

export interface PlanSnapshot {
  /** The active plan. */
  plan: PlanState;
  activeId: string;
  /** Every saved plan, in the order they were added. */
  plans: PlanListItem[];
  /** False when the last change could not be written to the device (storage blocked or full). */
  saved: boolean;
}

/** Calls the listener when another tab changes the stored plans; returns a stop function. */
export type StorageWatcher = (listener: (event: { key: string | null }) => void) => () => void;

export interface PlanStoreOptions {
  /** Where to keep the plans. Default: this browser's local storage (none on the server). */
  storage?: StorageLike | null;
  /** How to hear about changes from other tabs. Default: the window "storage" event. */
  watch?: StorageWatcher | null;
  /** Makes the id of a new plan. Default: a random id. */
  newId?: () => string;
  /** The clock, for the time a plan last changed. Default: the real time. */
  now?: () => Date;
}

function defaultWatcher(): StorageWatcher | null {
  if (typeof window === "undefined") return null;
  return (listener) => {
    const handler = (event: StorageEvent) => listener({ key: event.key });
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  };
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface PlanActions {
  setItem: (id: string, patch: FieldPatch) => void;
  setQuick: (id: string, patch: FieldPatch) => void;
  setAloneMonthly: (id: string, patch: FieldPatch) => void;
  setTopField: (key: TopField, patch: FieldPatch) => void;
  setAdults: (adults: number) => void;
  setChildren: (children: number) => void;
  setRegistrations: (registrations: number) => void;
  setTravelMode: (mode: PlanState["travel"]["mode"]) => void;
  setFollowMonths: (raw: string) => void;
  setChildAge: (index: number, raw: string) => void;
  setLocalCurrency: (code: string) => void;
  setRate: (raw: string) => void;
  setBufferMonths: (raw: string) => void;
  setUiMode: (mode: PlanState["uiMode"]) => void;
  /** Start the active plan again: every box empty, the name kept. */
  reset: () => void;
  /** Give the active plan a name. */
  setName: (name: string) => void;
  /** A new empty plan with this name; it becomes the active one. False when there is no room. */
  newPlan: (name: string) => boolean;
  /** Make a saved plan the active one. */
  openPlan: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  /** A copy of a plan under a new name; it becomes the active one. False when there is no room. */
  duplicatePlan: (id: string) => boolean;
  deletePlan: (id: string) => void;
  /** Adds a plan that came from a file or a link, under its own name (never over another plan), and opens it. */
  importPlan: (plan: PlanState) => boolean;
}

/** Function-typed fields (not methods) so they can be passed to React without losing `this`. */
export interface PlanStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => PlanSnapshot;
  getServerSnapshot: () => PlanSnapshot;
  /** The full state of a saved plan, for the comparison; null when there is no such plan. */
  getPlan: (id: string) => PlanState | null;
  actions: PlanActions;
}

const SERVER_SNAPSHOT: PlanSnapshot = { plan: emptyPlan(), activeId: "", plans: [], saved: true };

function snapshotOf(library: Library, saved: boolean): PlanSnapshot {
  return {
    plan: activeEntry(library).plan,
    activeId: activeEntry(library).id,
    plans: library.plans.map((p) => ({ id: p.id, name: p.plan.name, updatedAt: p.updatedAt })),
    saved,
  };
}

type Update = (change: (state: PlanState) => PlanState) => void;

/** The actions that edit the active plan. */
function fieldActions(update: Update) {
  return {
    setItem: (id: string, patch: FieldPatch) => update((s) => patchItem(s, id, patch)),
    setQuick: (id: string, patch: FieldPatch) => update((s) => patchQuick(s, id, patch)),
    setAloneMonthly: (id: string, patch: FieldPatch) => update((s) => patchAloneMonthly(s, id, patch)),
    setTopField: (key: TopField, patch: FieldPatch) => update((s) => patchTopField(s, key, patch)),
    setAdults: (adults: number) => update((s) => setAdults(s, adults)),
    setChildren: (children: number) => update((s) => setChildren(s, children)),
    setRegistrations: (registrations: number) => update((s) => setRegistrations(s, registrations)),
    setTravelMode: (mode: PlanState["travel"]["mode"]) => update((s) => setTravelMode(s, mode)),
    setFollowMonths: (raw: string) => update((s) => setFollowMonths(s, raw)),
    setChildAge: (index: number, raw: string) => update((s) => setChildAge(s, index, raw)),
    setLocalCurrency: (code: string) => update((s) => setLocalCurrency(s, code)),
    setRate: (raw: string) => update((s) => setRate(s, raw)),
    setBufferMonths: (raw: string) => update((s) => setBufferMonths(s, raw)),
    setUiMode: (mode: PlanState["uiMode"]) => update((s) => setUiMode(s, mode)),
    reset: () => update((s) => ({ ...emptyPlan(), name: s.name })),
  };
}

interface ListContext {
  load: () => Library;
  commit: (next: Library | null) => boolean;
  newId: () => string;
  now: () => Date;
}

/** The actions that work on the list of plans. */
function listActions({ load, commit, newId, now }: ListContext) {
  return {
    setName: (name: string) => void commit(renamePlan(load(), activeEntry(load()).id, name, now())),
    newPlan: (name: string) => commit(addPlan(load(), { ...emptyPlan(), name }, newId(), now())),
    openPlan: (id: string) => void commit(openPlan(load(), id)),
    renamePlan: (id: string, name: string) => void commit(renamePlan(load(), id, name, now())),
    duplicatePlan: (id: string) => commit(duplicatePlan(load(), id, newId(), now())),
    deletePlan: (id: string) => void commit(removePlan(load(), id, newId(), now())),
    importPlan: (plan: PlanState) => commit(addPlan(load(), plan, newId(), now())),
  };
}

export function createPlanStore(options: PlanStoreOptions = {}): PlanStore {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const watch = options.watch === undefined ? defaultWatcher() : options.watch;
  const newId = options.newId ?? randomId;
  const now = options.now ?? (() => new Date());

  let library: Library | null = null;
  let snapshot: PlanSnapshot | null = null;
  const listeners = new Set<() => void>();
  let stopWatching: (() => void) | null = null;

  function load(): Library {
    if (library === null) library = loadLibrary(storage, newId, now());
    return library;
  }

  function read(): PlanSnapshot {
    if (snapshot === null) snapshot = snapshotOf(load(), true);
    return snapshot;
  }

  function emit(): void {
    for (const listener of [...listeners]) listener();
  }

  function commitLibrary(next: Library | null): boolean {
    if (next === null) return false;
    if (next === load()) return true;
    library = next;
    snapshot = snapshotOf(next, saveLibrary(next, storage));
    emit();
    return true;
  }

  /** An edit of the active plan. */
  function update(change: (state: PlanState) => PlanState): void {
    const current = activeEntry(load()).plan;
    const next = change(current);
    if (next !== current) commitLibrary(withActivePlan(load(), next, now()));
  }

  function onOtherTab(event: { key: string | null }): void {
    if (event.key !== null && event.key !== LIBRARY_KEY) return;
    library = loadLibrary(storage, newId, now());
    snapshot = snapshotOf(library, true);
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
    ...fieldActions(update),
    ...listActions({ load, commit: commitLibrary, newId, now }),
  };

  const getPlan = (id: string): PlanState | null => load().plans.find((p) => p.id === id)?.plan ?? null;

  return { subscribe, getSnapshot: read, getServerSnapshot: () => SERVER_SNAPSHOT, getPlan, actions };
}

/** The store the whole site shares. */
export const planStore: PlanStore = createPlanStore();
