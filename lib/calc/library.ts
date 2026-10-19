import { z } from "zod";

import { MAX_NAME_LENGTH, emptyPlan, PlanStateSchema, type PlanState } from "@/lib/calc/model";

/**
 * The plans a person keeps on this device, each with the name he gave it ("Texas, alone",
 * "North Carolina, with the family"). One of them is the active plan: the one the calculators edit.
 * These are pure functions on the whole list; the store saves and shows the result.
 */

export const LIBRARY_VERSION = 1 as const;
export const MAX_PLANS = 50;

export const SavedPlanSchema = z.object({
  id: z.string().min(1).max(80),
  /** When the plan last changed, as an ISO date and time. */
  updatedAt: z.string().max(40),
  plan: PlanStateSchema,
});
export type SavedPlan = z.infer<typeof SavedPlanSchema>;

export const LibrarySchema = z.object({
  version: z.literal(LIBRARY_VERSION),
  activeId: z.string().max(80),
  plans: z.array(SavedPlanSchema).min(1).max(MAX_PLANS),
});
export type Library = z.infer<typeof LibrarySchema>;

/** A name as a person typed it: single spaces, no control characters, cut to the limit. */
export function cleanName(raw: string): string {
  const printable = [...raw]
    .map((ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch))
    .join("");
  const text = printable.replace(/\s+/g, " ").trim();
  return text.length > MAX_NAME_LENGTH ? text.slice(0, MAX_NAME_LENGTH).trim() : text;
}

/** `name`, or `name (2)`, `name (3)` ... when another plan already has it (compared without case). */
export function uniqueName(name: string, taken: readonly string[]): string {
  const clean = cleanName(name);
  if (clean === "") return "";
  const used = new Set(taken.map((t) => t.toLowerCase()));
  if (!used.has(clean.toLowerCase())) return clean;
  for (let n = 2; n <= MAX_PLANS + 1; n += 1) {
    const suffix = ` (${n})`;
    const candidate = `${clean.slice(0, MAX_NAME_LENGTH - suffix.length).trim()}${suffix}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  return clean;
}

export function libraryOf(plan: PlanState, id: string, now: Date): Library {
  return { version: LIBRARY_VERSION, activeId: id, plans: [{ id, updatedAt: now.toISOString(), plan }] };
}

/** The active entry; the first one if the stored id points nowhere. */
export function activeEntry(library: Library): SavedPlan {
  return library.plans.find((p) => p.id === library.activeId) ?? library.plans[0] ?? fallbackEntry();
}

function fallbackEntry(): SavedPlan {
  return { id: "plan-1", updatedAt: new Date(0).toISOString(), plan: emptyPlan() };
}

function names(library: Library, exceptId?: string): string[] {
  return library.plans.filter((p) => p.id !== exceptId).map((p) => p.plan.name);
}

/** The same library with the active plan replaced by `plan` (an edit). */
export function withActivePlan(library: Library, plan: PlanState, now: Date): Library {
  const id = activeEntry(library).id;
  return {
    ...library,
    activeId: id,
    plans: library.plans.map((p) => (p.id === id ? { ...p, plan, updatedAt: now.toISOString() } : p)),
  };
}

export function isFull(library: Library): boolean {
  return library.plans.length >= MAX_PLANS;
}

/** Adds a plan under a name no other plan has, and makes it the active one. Null when the list is full. */
export function addPlan(library: Library, plan: PlanState, id: string, now: Date): Library | null {
  if (isFull(library)) return null;
  const named = { ...plan, name: uniqueName(plan.name, names(library)) };
  return {
    ...library,
    activeId: id,
    plans: [...library.plans, { id, updatedAt: now.toISOString(), plan: named }],
  };
}

export function openPlan(library: Library, id: string): Library {
  if (library.activeId === id || !library.plans.some((p) => p.id === id)) return library;
  return { ...library, activeId: id };
}

export function renamePlan(library: Library, id: string, name: string, now: Date): Library {
  const target = library.plans.find((p) => p.id === id);
  if (!target) return library;
  const next = uniqueName(name, names(library, id));
  if (next === target.plan.name) return library;
  return {
    ...library,
    plans: library.plans.map((p) =>
      p.id === id ? { ...p, updatedAt: now.toISOString(), plan: { ...p.plan, name: next } } : p,
    ),
  };
}

/** A copy of one plan under a new name and a new id; the copy becomes the active plan. */
export function duplicatePlan(library: Library, id: string, newId: string, now: Date): Library | null {
  const source = library.plans.find((p) => p.id === id);
  return source ? addPlan(library, source.plan, newId, now) : library;
}

/**
 * Removes a plan. The list is never empty: removing the last plan leaves one new empty plan.
 * If the active plan is removed, the first remaining plan becomes active.
 */
export function removePlan(library: Library, id: string, replacementId: string, now: Date): Library {
  const remaining = library.plans.filter((p) => p.id !== id);
  if (remaining.length === library.plans.length) return library;
  if (remaining.length === 0) return libraryOf(emptyPlan(), replacementId, now);
  const activeId = remaining.some((p) => p.id === library.activeId)
    ? library.activeId
    : (remaining[0]?.id ?? "");
  return { ...library, activeId, plans: remaining };
}

/** The name to show for a plan: its own, or "plan 2" built from its place in the list. */
export function displayName(plan: PlanState, index: number, fallbackLabel: string): string {
  return plan.name !== "" ? plan.name : `${fallbackLabel} ${index + 1}`;
}
