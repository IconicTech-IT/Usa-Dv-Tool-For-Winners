"use client";

import { useLocale, useTranslations } from "next-intl";

import { useNumberLocale } from "@/components/calc/format";
import { RuleNote } from "@/components/guide/RuleNote";
import { MAX_FOLLOW_MONTHS, type Travel } from "@/lib/calc/model";
import { formatNumber } from "@/lib/calc/parse-amount";
import { followMonthsOf, isLateArrival } from "@/lib/calc/scaling";
import type { PlanView } from "@/lib/calc/use-plan";
import { noteById } from "@/lib/guide/notes";

/** How the household travels: all together, or the principal first and the family some months later. */
export function TravelChoice({ view }: { view: PlanView }) {
  const t = useTranslations("setup.travel");
  const { adults, children } = view.plan.household;
  // There is nobody to follow a person who travels alone.
  if (adults + children < 2) return null;

  const isFollow = view.plan.travel.mode === "follow";
  const choose = (mode: Travel["mode"]) => view.actions.setTravelMode(mode);

  return (
    <>
      <div className="field">
        <div className="label">{t("title")}</div>
        <div className="seg tall" role="group" aria-label={t("title")}>
          <button
            type="button"
            className={isFollow ? undefined : "on"}
            aria-pressed={!isFollow}
            onClick={() => choose("together")}
          >
            {t("together")}
          </button>
          <button
            type="button"
            className={isFollow ? "on" : undefined}
            aria-pressed={isFollow}
            onClick={() => choose("follow")}
          >
            {t("follow")}
          </button>
        </div>
      </div>
      {isFollow ? <FollowDetails view={view} /> : <div className="help">{t("same")}</div>}
    </>
  );
}

function FollowDetails({ view }: { view: PlanView }) {
  const t = useTranslations("setup.travel");
  const labels = useTranslations();
  const locale = useLocale() === "en" ? "en" : "ar";
  const numbers = useNumberLocale();
  const months = followMonthsOf(view.plan);
  const note = noteById("visaExpiry", locale);

  return (
    <div className="field">
      <label className="chip">
        {t("monthsLabel")}
        <input
          inputMode="numeric"
          autoComplete="off"
          maxLength={2}
          value={view.plan.travel.followMonths}
          aria-describedby="follow-months-help"
          onChange={(event) => view.actions.setFollowMonths(event.target.value)}
        />
      </label>
      <div id="follow-months-help" className="help">
        {months === null
          ? t("monthsMissing")
          : t("monthsHelp", { max: formatNumber(MAX_FOLLOW_MONTHS, numbers, 0) })}
      </div>
      <div className="help">{t("same")}</div>
      {note ? <RuleNote note={note} sourceWord={labels("guide.source")} /> : null}
      {isLateArrival(months) ? <div className="warn">{t("tooLong")}</div> : null}
    </div>
  );
}
