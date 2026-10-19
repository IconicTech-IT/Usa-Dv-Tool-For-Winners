"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { PlanView } from "@/lib/calc/use-plan";

/** One line when a child has no age yet: the costs that depend on age count that child as a small child. */
export function AgesNudge({ view }: { view: PlanView }) {
  const t = useTranslations("calc");
  if (view.result.agesUnknown === 0) return null;
  return (
    <div className="note" style={{ marginTop: 12 }}>
      {t("agesNudge")}{" "}
      <Link className="ilink" href="/setup">
        {t("agesNudgeLink")}
      </Link>
    </div>
  );
}
