"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { displayName } from "@/lib/calc/library";
import type { PlanView } from "@/lib/calc/use-plan";

/** The name of the plan being edited, with a way to the list of plans. Shown at the top of every calculator. */
export function PlanBar({ view }: { view: PlanView }) {
  const t = useTranslations("plans");
  const index = Math.max(
    0,
    view.plans.findIndex((p) => p.id === view.activeId),
  );
  return (
    <div className="planbar">
      <span>
        {t("current")}: <b>{displayName(view.plan, index, t("defaultName"))}</b>
      </span>
      <Link className="ilink" href="/plans">
        {t("manage")}
      </Link>
    </div>
  );
}
