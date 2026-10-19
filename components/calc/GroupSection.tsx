"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { DualAmount } from "@/components/calc/DualAmount";
import { Icon } from "@/components/Icon";
import type { GroupDef } from "@/lib/calc/catalog";
import { groupSubtotal } from "@/lib/calc/summary";
import type { PlanView } from "@/lib/calc/use-plan";

interface GroupSectionProps {
  group: GroupDef;
  /** The number shown in the round badge. */
  position: number;
  view: PlanView;
  /** The money boxes of the group. */
  children: ReactNode;
}

/** One collapsible group of money boxes with its own subtotal (the "stage" card of the design). */
export function GroupSection({ group, position, view, children }: GroupSectionProps) {
  const t = useTranslations();
  const bodyId = useId();
  const [isOpen, setIsOpen] = useState(true);
  const subtotal = groupSubtotal(view.result, group);

  return (
    <section className={isOpen ? "stage" : "stage closed"}>
      <h2 className="stage-title">
        <button
          type="button"
          className="hd"
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="n">
            <span className="num">{position}</span>
            <span>
              <span className="title">{t(`calc.groups.${group.id}`)}</span>
              <span className="sub">
                {t(`calc.groupHints.${group.id}`)} · <b className="when">{t(`calc.stages.${group.stage}`)}</b>
              </span>
            </span>
          </span>
          <Icon name="chevronUp" />
        </button>
      </h2>
      <div className="bd" id={bodyId} hidden={!isOpen}>
        {children}
        <div className="subtot">
          <span>{t("common.stageTotal")}</span>
          <DualAmount
            cents={subtotal.hasTyped ? subtotal.cents : null}
            result={view.result}
            localCode={view.plan.localCurrency}
          />
        </div>
      </div>
    </section>
  );
}
