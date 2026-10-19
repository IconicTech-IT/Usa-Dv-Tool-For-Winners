"use client";

import { useTranslations } from "next-intl";

import { NameInput } from "@/components/plans/NameInput";
import type { PlanView } from "@/lib/calc/use-plan";

/** The box where the active plan gets its name; it starts again when the plan or its name changes. */
export function PlanNameField({ view }: { view: PlanView }) {
  const t = useTranslations("plans");
  return (
    <>
      <NameInput
        key={`${view.activeId}:${view.plan.name}`}
        initial={view.plan.name}
        label={t("nameLabel")}
        placeholder={t("namePlaceholder")}
        onCommit={view.actions.setName}
      />
      <div className="help">{t("nameHelp")}</div>
    </>
  );
}
