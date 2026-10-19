"use client";

import { GroupSection } from "@/components/calc/GroupSection";
import { ItemField } from "@/components/calc/ItemField";
import { groupsOfCalculator, type Calculator } from "@/lib/calc/catalog";
import type { PlanView } from "@/lib/calc/use-plan";

interface CalculatorGroupsProps {
  view: PlanView;
  calculator: Calculator;
}

/** Every group of one calculator (fees or moving), each with its money boxes and subtotal. */
export function CalculatorGroups({ view, calculator }: CalculatorGroupsProps) {
  return (
    <>
      {groupsOfCalculator(calculator, view.result.follow !== null).map((group, index) => (
        <GroupSection key={group.id} group={group} position={index + 1} view={view}>
          {group.items.map((item) => (
            <ItemField key={item.id} view={view} id={item.id} kind="item" />
          ))}
        </GroupSection>
      ))}
    </>
  );
}
