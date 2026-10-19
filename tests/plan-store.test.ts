import { describe, expect, it, vi } from "vitest";

import { emptyPlan, MAX_RAW_LENGTH } from "@/lib/calc/model";
import {
  patchItem,
  patchQuick,
  patchTopField,
  setAdults,
  setChildAge,
  setChildren,
  setLocalCurrency,
  setRate,
  setUiMode,
} from "@/lib/calc/plan-actions";
import { createPlanStore, type StorageWatcher } from "@/lib/calc/plan-store";
import { loadPlan, STORAGE_KEY, type StorageLike } from "@/lib/calc/storage";

class MemoryStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

class BlockedStorage extends MemoryStorage {
  override setItem(): void {
    throw new Error("quota exceeded");
  }
}

function hub() {
  const listeners = new Set<(event: { key: string | null }) => void>();
  const watch: StorageWatcher = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return { listeners, watch, fire: (key: string | null) => listeners.forEach((l) => l({ key })) };
}

describe("plan actions (pure)", () => {
  it("changes an item's text, currency and per-person switch", () => {
    const start = emptyPlan();
    const typed = patchItem(start, "ticket", { raw: "١٢٠٠" });
    expect(typed.items.ticket?.raw).toBe("١٢٠٠");
    const local = patchItem(typed, "ticket", { currency: "local" });
    expect(local.items.ticket?.currency).toBe("local");
    const toggled = patchItem(local, "travelInsurance", { perPerson: true });
    expect(toggled.items.travelInsurance?.perPerson).toBe(true);
  });

  it("returns the same object when nothing changes", () => {
    const start = emptyPlan();
    expect(patchItem(start, "ticket", { raw: "" })).toBe(start);
    expect(patchItem(start, "ticket", { currency: "usd" })).toBe(start);
    expect(setAdults(start, 1)).toBe(start);
    expect(setChildren(start, 0)).toBe(start);
    expect(setRate(start, "")).toBe(start);
    expect(setLocalCurrency(start, "EGP")).toBe(start);
    expect(setUiMode(start, "detailed")).toBe(start);
  });

  it("ignores unknown item ids and bad values", () => {
    const start = emptyPlan();
    expect(patchItem(start, "notAnItem", { raw: "5" })).toBe(start);
    expect(patchQuick(start, "ticket", { raw: "5" })).toBe(start);
    expect(patchItem(start, "ticket", { currency: "eur" as never })).toBe(start);
    expect(setLocalCurrency(start, "egp")).toBe(start);
    expect(setLocalCurrency(start, "EGPX")).toBe(start);
    expect(setUiMode(start, "weird" as never)).toBe(start);
    expect(setAdults(start, Number.NaN)).toBe(start);
  });

  it("cuts long text to the schema limit so the saved plan stays valid", () => {
    const long = "9".repeat(MAX_RAW_LENGTH + 25);
    const next = patchItem(emptyPlan(), "ticket", { raw: long });
    expect(next.items.ticket?.raw).toHaveLength(MAX_RAW_LENGTH);
    expect(setRate(emptyPlan(), long).rate).toHaveLength(MAX_RAW_LENGTH);
  });

  it("keeps the children count and ages in step, and clamps the counts", () => {
    let s = setChildren(emptyPlan(), 3);
    expect(s.household.childAges).toEqual(["", "", ""]);
    s = setChildAge(s, 1, "٤");
    expect(s.household.childAges).toEqual(["", "٤", ""]);
    expect(setChildAge(s, 3, "5")).toBe(s);
    expect(setChildAge(s, -1, "5")).toBe(s);
    s = setChildren(s, 1);
    expect(s.household.childAges).toEqual([""]);
    expect(setAdults(emptyPlan(), 0).household.adults).toBe(1);
    expect(setAdults(emptyPlan(), 999).household.adults).toBe(10);
    expect(setChildren(emptyPlan(), -4)).toEqual(emptyPlan());
  });

  it("patches income, spouse income and savings", () => {
    const s = patchTopField(emptyPlan(), "savings", { raw: "500", currency: "local" });
    expect(s.savings).toEqual({ raw: "500", currency: "local" });
    expect(s.income).toEqual({ raw: "", currency: "usd" });
  });
});

describe("plan store", () => {
  it("starts with the empty plan on the server and on a fresh device", () => {
    const store = createPlanStore({ storage: new MemoryStorage(), watch: null });
    expect(store.getSnapshot().plan).toEqual(emptyPlan());
    expect(store.getSnapshot().saved).toBe(true);
    expect(store.getServerSnapshot().plan).toEqual(emptyPlan());
    expect(store.getServerSnapshot()).toBe(store.getServerSnapshot());
  });

  it("saves every change and loads it back in a new store", () => {
    const storage = new MemoryStorage();
    const a = createPlanStore({ storage, watch: null });
    a.actions.setItem("ticket", { raw: "250" });
    a.actions.setRate("49.5");
    a.actions.setChildren(2);
    expect(loadPlan(storage).rate).toBe("49.5");

    const b = createPlanStore({ storage, watch: null });
    expect(b.getSnapshot().plan.items.ticket?.raw).toBe("250");
    expect(b.getSnapshot().plan.household.children).toBe(2);
  });

  it("keeps the same snapshot object until something changes, and does not notify for no-ops", () => {
    const store = createPlanStore({ storage: new MemoryStorage(), watch: null });
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    const first = store.getSnapshot();
    expect(store.getSnapshot()).toBe(first);

    store.actions.setItem("ticket", { raw: "" });
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(first);

    store.actions.setItem("ticket", { raw: "1" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).not.toBe(first);
    stop();
  });

  it("stays valid after hostile input: the stored plan still loads", () => {
    const storage = new MemoryStorage();
    const store = createPlanStore({ storage, watch: null });
    store.actions.setItem("ticket", { raw: "7".repeat(500) });
    store.actions.setItem("madeUp", { raw: "1" });
    const loaded = loadPlan(storage);
    expect(loaded.items.ticket?.raw).toHaveLength(MAX_RAW_LENGTH);
    expect(Object.keys(loaded.items)).not.toContain("madeUp");
  });

  it("marks saved as false when storage refuses, and keeps working", () => {
    const store = createPlanStore({ storage: new BlockedStorage(), watch: null });
    expect(() => store.actions.setItem("ticket", { raw: "5" })).not.toThrow();
    expect(store.getSnapshot().saved).toBe(false);
    expect(store.getSnapshot().plan.items.ticket?.raw).toBe("5");
  });

  it("works with no storage at all (private mode, server)", () => {
    const store = createPlanStore({ storage: null, watch: null });
    store.actions.setRate("3");
    expect(store.getSnapshot().plan.rate).toBe("3");
    expect(store.getSnapshot().saved).toBe(false);
  });

  it("picks up a change made in another tab and ignores other keys", () => {
    const storage = new MemoryStorage();
    const h = hub();
    const a = createPlanStore({ storage, watch: null });
    const b = createPlanStore({ storage, watch: h.watch });
    const listener = vi.fn();
    const stop = b.subscribe(listener);
    expect(h.listeners.size).toBe(1);
    expect(b.getSnapshot().plan.items.ticket?.raw).toBe(""); // loads now, before the other tab writes

    a.actions.setItem("ticket", { raw: "321" });
    h.fire("some-other-key");
    expect(listener).not.toHaveBeenCalled();
    expect(b.getSnapshot().plan.items.ticket?.raw).toBe("");

    h.fire(STORAGE_KEY);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(b.getSnapshot().plan.items.ticket?.raw).toBe("321");

    h.fire(null); // storage cleared in the other tab
    expect(listener).toHaveBeenCalledTimes(2);

    stop();
    expect(h.listeners.size).toBe(0);
  });

  it("reset forgets everything and tells the listeners", () => {
    const storage = new MemoryStorage();
    const store = createPlanStore({ storage, watch: null });
    store.actions.setRate("12");
    const listener = vi.fn();
    store.subscribe(listener);
    store.actions.reset();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(store.getSnapshot().plan).toEqual(emptyPlan());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("replace swaps the whole plan (for an opened file)", () => {
    const storage = new MemoryStorage();
    const store = createPlanStore({ storage, watch: null });
    const other = { ...emptyPlan(), rate: "55" };
    store.actions.replace(other);
    expect(store.getSnapshot().plan.rate).toBe("55");
    expect(loadPlan(storage).rate).toBe("55");
  });
});
