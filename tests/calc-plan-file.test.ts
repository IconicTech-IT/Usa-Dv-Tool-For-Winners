import { describe, expect, it } from "vitest";

import { emptyPlan, withChildren } from "@/lib/calc/model";
import {
  MAX_PLAN_FILE_CHARS,
  normalizePlan,
  parsePlanFile,
  planFileName,
  serializePlan,
} from "@/lib/calc/plan-file";
import { clearPlan, loadPlan, savePlan, STORAGE_KEY, type StorageLike } from "@/lib/calc/storage";

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe("plan file", () => {
  it("round-trips a plan through save and open", () => {
    const plan = emptyPlan();
    plan.rate = "١٢٫٥";
    plan.household = withChildren({ adults: 2, children: 0, childAges: [] }, 2);
    plan.items["rent"] = { raw: "1,000", currency: "local" };
    const text = serializePlan(plan, new Date("2026-10-19T10:00:00Z"));
    const opened = parsePlanFile(text);
    expect(opened.ok).toBe(true);
    if (opened.ok) expect(opened.state).toEqual(normalizePlan(plan));
  });

  it("names the download after the date", () => {
    expect(planFileName(new Date("2026-10-19T10:00:00Z"))).toBe("dv-compass-plan-2026-10-19.json");
  });

  it("rejects files that are not ours or are broken", () => {
    expect(parsePlanFile("not json")).toEqual({ ok: false, reason: "not-json" });
    expect(parsePlanFile(JSON.stringify({ hello: 1 }))).toEqual({ ok: false, reason: "wrong-format" });
    const bad = JSON.stringify({ format: "dv-compass-plan", state: { version: 1 } });
    expect(parsePlanFile(bad)).toEqual({ ok: false, reason: "invalid" });
    expect(parsePlanFile("x".repeat(MAX_PLAN_FILE_CHARS + 1))).toEqual({ ok: false, reason: "too-large" });
  });

  it("rejects a household with no adult", () => {
    const plan = emptyPlan();
    const text = serializePlan({ ...plan, household: { adults: 0, children: 0, childAges: [] } });
    expect(parsePlanFile(text)).toEqual({ ok: false, reason: "invalid" });
  });

  it("fills missing items and drops unknown ones when opening", () => {
    const plan = emptyPlan();
    delete plan.items["rent"];
    plan.items["madeUpItem"] = { raw: "5", currency: "usd" };
    const opened = parsePlanFile(serializePlan(plan));
    expect(opened.ok).toBe(true);
    if (opened.ok) {
      expect(opened.state.items["rent"]).toEqual({ raw: "", currency: "usd" });
      expect(opened.state.items["madeUpItem"]).toBeUndefined();
    }
  });
});

describe("local storage", () => {
  it("returns an empty plan when nothing is stored", () => {
    expect(loadPlan(memoryStorage())).toEqual(emptyPlan());
  });

  it("saves and loads the same plan", () => {
    const storage = memoryStorage();
    const plan = emptyPlan();
    plan.items["food"] = { raw: "٥٠٠", currency: "usd" };
    expect(savePlan(plan, storage)).toBe(true);
    expect(loadPlan(storage)).toEqual(normalizePlan(plan));
  });

  it("falls back to an empty plan on corrupted data", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, "{broken");
    expect(loadPlan(storage)).toEqual(emptyPlan());
  });

  it("never throws when storage is blocked or full", () => {
    const blocked: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadPlan(blocked)).toEqual(emptyPlan());
    expect(savePlan(emptyPlan(), blocked)).toBe(false);
    expect(() => clearPlan(blocked)).not.toThrow();
    expect(savePlan(emptyPlan(), null)).toBe(false);
  });

  it("clears the stored plan", () => {
    const storage = memoryStorage();
    savePlan(emptyPlan(), storage);
    clearPlan(storage);
    expect(storage.data.size).toBe(0);
  });
});
