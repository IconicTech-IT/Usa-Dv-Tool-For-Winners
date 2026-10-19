import { useMemo, useSyncExternalStore } from "react";

import { computePlan } from "@/lib/calc/compute";
import { planStore } from "@/lib/calc/plan-store";

/**
 * The plan for a component: what the user typed, the computed result, and the
 * actions that change it. Use it only in client components.
 */
export function usePlan() {
  const snapshot = useSyncExternalStore(
    planStore.subscribe,
    planStore.getSnapshot,
    planStore.getServerSnapshot,
  );
  const result = useMemo(() => computePlan(snapshot.plan), [snapshot.plan]);
  return { plan: snapshot.plan, saved: snapshot.saved, result, actions: planStore.actions };
}
