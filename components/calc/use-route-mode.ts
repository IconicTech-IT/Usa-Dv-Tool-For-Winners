"use client";

import { useEffect } from "react";

import type { PlanState } from "@/lib/calc/model";
import type { PlanView } from "@/lib/calc/use-plan";

/**
 * The quick and the detailed pages each need their own mode, because the totals use only
 * the boxes of the current mode. Opening a page puts the plan in that page's mode.
 */
export function useRouteMode(view: PlanView, mode: PlanState["uiMode"]): void {
  const currentMode = view.plan.uiMode;
  const { setUiMode } = view.actions;
  useEffect(() => {
    if (currentMode !== mode) setUiMode(mode);
  }, [currentMode, mode, setUiMode]);
}
