"use client";

import { useTranslations } from "next-intl";

import { CalculatorGroups } from "@/components/calc/CalculatorGroups";
import { ModeSwitch } from "@/components/calc/ModeSwitch";
import { RatePanel } from "@/components/calc/RatePanel";
import { PlanBar } from "@/components/plans/PlanBar";
import { StickyTotal } from "@/components/calc/StickyTotal";
import { useRouteMode } from "@/components/calc/use-route-mode";
import { usePlan } from "@/lib/calc/use-plan";

const SCREENS = {
  fees: { path: "/fees", next: "/moving" },
  moving: { path: "/moving", next: "/runway" },
} as const;

interface GroupedCalculatorScreenProps {
  calculator: keyof typeof SCREENS;
}

/** The fees and the moving calculators: the same screen with different groups of boxes. */
export function GroupedCalculatorScreen({ calculator }: GroupedCalculatorScreenProps) {
  const t = useTranslations(calculator);
  const view = usePlan();
  useRouteMode(view, "detailed");
  const screen = SCREENS[calculator];

  return (
    <div className="calc-page">
      <PlanBar view={view} />
      <RatePanel view={view} />
      <h1>{t("title")}</h1>
      <p className="lead">{t("lead")}</p>
      <ModeSwitch current="detailed" detailedHref={screen.path} />
      <CalculatorGroups view={view} calculator={calculator} />
      <div className="note">{t("note")}</div>
      <StickyTotal view={view} nextHref={screen.next} />
    </div>
  );
}
