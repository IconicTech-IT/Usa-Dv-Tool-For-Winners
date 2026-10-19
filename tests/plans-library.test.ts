import { describe, expect, it, vi } from "vitest";

import {
  activeEntry,
  addPlan,
  cleanName,
  displayName,
  duplicatePlan,
  libraryOf,
  MAX_PLANS,
  openPlan,
  removePlan,
  renamePlan,
  uniqueName,
  withActivePlan,
} from "@/lib/calc/library";
import { emptyPlan, MAX_NAME_LENGTH, REGISTRATION_FEE_ITEM } from "@/lib/calc/model";
import { planFileName, serializePlan, parsePlanFile } from "@/lib/calc/plan-file";
import { createPlanStore } from "@/lib/calc/plan-store";
import { LIBRARY_KEY, loadLibrary, STORAGE_KEY, type StorageLike } from "@/lib/calc/storage";

const NOW = new Date("2026-10-19T12:00:00Z");

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

/** A store with ids p1, p2, ... and a fixed clock, so results are predictable. */
function store(storage = new MemoryStorage()) {
  let n = 0;
  return {
    storage,
    store: createPlanStore({ storage, watch: null, newId: () => `p${(n += 1)}`, now: () => NOW }),
  };
}

describe("plan names", () => {
  it("are cleaned: single spaces, no control characters, cut to the limit", () => {
    expect(cleanName("  Texas   -  alone \n")).toBe("Texas - alone");
    expect(cleanName("a\u0000b")).toBe("a b");
    expect(cleanName("x".repeat(MAX_NAME_LENGTH + 20))).toHaveLength(MAX_NAME_LENGTH);
  });

  it("get a number when another plan already has the name, without caring about case", () => {
    expect(uniqueName("Texas", [])).toBe("Texas");
    expect(uniqueName("Texas", ["texas"])).toBe("Texas (2)");
    expect(uniqueName("Texas", ["Texas", "Texas (2)"])).toBe("Texas (3)");
    expect(uniqueName("   ", ["x"])).toBe("");
  });

  it("show as 'Plan 2' from the place in the list when empty", () => {
    expect(displayName({ ...emptyPlan(), name: "" }, 1, "Plan")).toBe("Plan 2");
    expect(displayName({ ...emptyPlan(), name: "Texas" }, 1, "Plan")).toBe("Texas");
  });
});

describe("the list of plans (pure)", () => {
  const start = libraryOf({ ...emptyPlan(), name: "Texas" }, "a", NOW);

  it("adds a plan under a free name and makes it the active one", () => {
    const next = addPlan(start, { ...emptyPlan(), name: "Texas" }, "b", NOW);
    expect(next?.plans.map((p) => p.plan.name)).toEqual(["Texas", "Texas (2)"]);
    expect(next?.activeId).toBe("b");
  });

  it("never overwrites a plan when one is added", () => {
    const typed = { ...emptyPlan(), name: "Texas", rate: "50" };
    const one = withActivePlan(start, typed, NOW);
    const two = addPlan(one, { ...emptyPlan(), name: "Texas", rate: "99" }, "b", NOW);
    expect(two?.plans.find((p) => p.id === "a")?.plan.rate).toBe("50");
  });

  it("refuses a new plan when the list is full", () => {
    let full = start;
    for (let i = 0; i < MAX_PLANS - 1; i += 1) full = addPlan(full, emptyPlan(), `id${i}`, NOW) ?? full;
    expect(full.plans).toHaveLength(MAX_PLANS);
    expect(addPlan(full, emptyPlan(), "extra", NOW)).toBeNull();
  });

  it("renames, opens and duplicates", () => {
    const two = addPlan(start, { ...emptyPlan(), name: "Ohio" }, "b", NOW) ?? start;
    expect(renamePlan(two, "b", "North Carolina", NOW).plans[1]?.plan.name).toBe("North Carolina");
    expect(renamePlan(two, "b", "Texas", NOW).plans[1]?.plan.name).toBe("Texas (2)");
    expect(renamePlan(two, "b", "Ohio", NOW)).toBe(two);
    expect(openPlan(two, "a").activeId).toBe("a");
    expect(openPlan(two, "nobody")).toBe(two);
    const copy = duplicatePlan(two, "a", "c", NOW);
    expect(copy?.plans.map((p) => p.plan.name)).toEqual(["Texas", "Ohio", "Texas (2)"]);
    expect(copy?.activeId).toBe("c");
  });

  it("removes a plan, moves the active one if needed, and never leaves the list empty", () => {
    const two = addPlan(start, { ...emptyPlan(), name: "Ohio" }, "b", NOW) ?? start;
    const withoutActive = removePlan(two, "b", "n", NOW);
    expect(withoutActive.plans.map((p) => p.id)).toEqual(["a"]);
    expect(withoutActive.activeId).toBe("a");
    const empty = removePlan(withoutActive, "a", "n", NOW);
    expect(empty.plans).toHaveLength(1);
    expect(empty.plans[0]?.id).toBe("n");
    expect(removePlan(two, "nobody", "n", NOW)).toBe(two);
  });

  it("falls back to the first plan when the active id points nowhere", () => {
    expect(activeEntry({ ...start, activeId: "gone" }).id).toBe("a");
  });
});

describe("the plan store with several plans", () => {
  it("keeps one plan on a fresh device and saves under its own id", () => {
    const { store: s, storage } = store();
    expect(s.getSnapshot().plans).toHaveLength(1);
    s.actions.setRate("50");
    expect(loadLibrary(storage).plans).toHaveLength(1);
    expect(storage.getItem(LIBRARY_KEY)).not.toBeNull();
  });

  it("makes, names, switches between and removes plans, keeping each plan's numbers apart", () => {
    const { store: s } = store();
    s.actions.setName("Texas - alone");
    s.actions.setItem("rent", { raw: "1000" });
    expect(s.actions.newPlan("NC - family")).toBe(true);
    expect(s.getSnapshot().plan.name).toBe("NC - family");
    expect(s.getSnapshot().plan.items["rent"]?.raw).toBe("");
    s.actions.setItem("rent", { raw: "800" });

    const [first, second] = s.getSnapshot().plans;
    expect(first?.name).toBe("Texas - alone");
    expect(second?.name).toBe("NC - family");
    s.actions.openPlan(first?.id ?? "");
    expect(s.getSnapshot().plan.items["rent"]?.raw).toBe("1000");
    expect(s.getPlan(second?.id ?? "")?.items["rent"]?.raw).toBe("800");
    expect(s.getPlan("nobody")).toBeNull();

    s.actions.deletePlan(second?.id ?? "");
    expect(s.getSnapshot().plans.map((p) => p.name)).toEqual(["Texas - alone"]);
  });

  it("duplicates a plan under a new name without touching the original", () => {
    const { store: s } = store();
    s.actions.setName("Texas");
    s.actions.setRate("50");
    const original = s.getSnapshot().activeId;
    expect(s.actions.duplicatePlan(original)).toBe(true);
    expect(s.getSnapshot().plan.name).toBe("Texas (2)");
    expect(s.getSnapshot().plan.rate).toBe("50");
    s.actions.setRate("60");
    expect(s.getPlan(original)?.rate).toBe("50");
  });

  it("imports a file or link as a new plan and never replaces the open one", () => {
    const { store: s } = store();
    s.actions.setName("Mine");
    s.actions.setRate("50");
    expect(s.actions.importPlan({ ...emptyPlan(), name: "Mine", rate: "99" })).toBe(true);
    expect(s.getSnapshot().plans.map((p) => p.name)).toEqual(["Mine", "Mine (2)"]);
    expect(s.getPlan(s.getSnapshot().plans[0]?.id ?? "")?.rate).toBe("50");
    expect(s.getSnapshot().plan.rate).toBe("99");
  });

  it("starts the active plan again without losing its name or the other plans", () => {
    const { store: s } = store();
    s.actions.setName("A");
    s.actions.newPlan("B");
    s.actions.setRate("7");
    s.actions.reset();
    expect(s.getSnapshot().plan).toEqual({ ...emptyPlan(), name: "B" });
    expect(s.getSnapshot().plans).toHaveLength(2);
  });

  it("tells listeners once per change and stays quiet for a no-op", () => {
    const { store: s } = store();
    const listener = vi.fn();
    s.subscribe(listener);
    s.actions.setName("A");
    s.actions.setName("A");
    expect(listener).toHaveBeenCalledTimes(1);
    s.actions.openPlan(s.getSnapshot().activeId);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("moving the old single plan into the list", () => {
  it("makes the old plan the first plan, keeps its numbers, and removes the old copy", () => {
    const storage = new MemoryStorage();
    const old = { ...emptyPlan(), rate: "47" } as Record<string, unknown>;
    delete old["name"];
    delete old["registrations"];
    storage.setItem(STORAGE_KEY, JSON.stringify(old));

    const library = loadLibrary(storage, () => "first", NOW);
    expect(library.plans).toHaveLength(1);
    expect(library.plans[0]?.plan.rate).toBe("47");
    expect(library.plans[0]?.plan.name).toBe("");
    expect(library.plans[0]?.plan.registrations).toBe(1);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem(LIBRARY_KEY)).not.toBeNull();
  });

  it("gives a plan saved without the fee box the official fee, and starts clean from a broken list", () => {
    const storage = new MemoryStorage();
    storage.setItem(LIBRARY_KEY, "{not json");
    const library = loadLibrary(storage, () => "x", NOW);
    expect(library.plans[0]?.plan.items[REGISTRATION_FEE_ITEM]?.raw).toBe("1");
  });
});

describe("the plan name in the saved file", () => {
  it("goes into the file name, without characters a file name cannot hold", () => {
    const day = new Date("2026-10-19T10:00:00Z");
    expect(planFileName(day)).toBe("dv-compass-plan-2026-10-19.json");
    expect(planFileName(day, "Texas - alone")).toBe("dv-compass-Texas---alone-2026-10-19.json");
    expect(planFileName(day, 'a/b\\c:d*e?f"g<h>i|j')).toBe("dv-compass-a-b-c-d-e-f-g-h-i-j-2026-10-19.json");
    expect(planFileName(day, "تكساس - لوحدي")).toContain("تكساس");
    expect(planFileName(day, "///")).toBe("dv-compass-plan-2026-10-19.json");
  });

  it("travels inside the file, so opening it gives the plan its name back", () => {
    const opened = parsePlanFile(serializePlan({ ...emptyPlan(), name: "Texas - alone" }));
    expect(opened.ok && opened.state.name).toBe("Texas - alone");
  });
});
