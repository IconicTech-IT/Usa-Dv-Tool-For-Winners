"use client";

import { useLocale, useTranslations } from "next-intl";

import { Stepper } from "@/components/calc/Stepper";
import { TravelChoice } from "@/components/calc/TravelChoice";
import { RuleNote } from "@/components/guide/RuleNote";
import { PlanNameField } from "@/components/plans/PlanNameField";
import { Link } from "@/i18n/navigation";
import { MAX_ADULTS, MAX_CHILDREN } from "@/lib/calc/model";
import { usePlan, type PlanView } from "@/lib/calc/use-plan";
import { noteById } from "@/lib/guide/notes";

/** Who travels: the adults and children the "per person" costs are multiplied by. */
export function SetupScreen() {
  const t = useTranslations("setup");
  const view = usePlan();
  const { adults, children } = view.plan.household;
  const { setAdults, setChildren } = view.actions;

  return (
    <div className="calc-page">
      <h1>{t("title")}</h1>
      <p className="lead">{t("lead")}</p>
      <PlanNameField view={view} />
      <WhoChoice view={view} />
      <Stepper
        label={t("adults")}
        help={t("adultsHelp")}
        value={adults}
        min={1}
        max={MAX_ADULTS}
        onChange={setAdults}
      />
      <Stepper
        label={t("kids")}
        help={t("kidsHelp")}
        value={children}
        min={0}
        max={MAX_CHILDREN}
        onChange={setChildren}
      />
      <ChildAges view={view} />
      <TravelChoice view={view} />
      <FamilyListingRule />
      <div className="note">{t("note")}</div>
      <Link className="btn pr" href="/fees" style={{ marginTop: 18 }}>
        {t("next")}
      </Link>
    </div>
  );
}

function WhoChoice({ view }: { view: PlanView }) {
  const t = useTranslations("setup");
  const { adults, children } = view.plan.household;
  const isAlone = adults === 1 && children === 0;

  const chooseAlone = () => {
    view.actions.setAdults(1);
    view.actions.setChildren(0);
  };
  // "With the family" starts from two adults; the steppers adjust it.
  const chooseFamily = () => {
    if (isAlone) view.actions.setAdults(2);
  };

  return (
    <div className="field">
      <div className="label">{t("who")}</div>
      <div className="seg" role="group" aria-label={t("who")}>
        <button
          type="button"
          className={isAlone ? "on" : undefined}
          aria-pressed={isAlone}
          onClick={chooseAlone}
        >
          {t("alone")}
        </button>
        <button
          type="button"
          className={isAlone ? undefined : "on"}
          aria-pressed={!isAlone}
          onClick={chooseFamily}
        >
          {t("family")}
        </button>
      </div>
    </div>
  );
}

function ChildAges({ view }: { view: PlanView }) {
  const t = useTranslations("setup");
  const { children, childAges } = view.plan.household;
  if (children === 0) return null;

  return (
    <div className="field">
      <div className="help">{t("agesHelp")}</div>
      <div className="chips">
        {childAges.map((age, index) => (
          // The list is positional (child 1, child 2, ...), so the index is the identity.
          <label key={index} className="chip">
            {t("child")} {index + 1}
            <input
              inputMode="numeric"
              autoComplete="off"
              maxLength={3}
              value={age}
              onChange={(event) => view.actions.setChildAge(index, event.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/** The official rule about who must be listed on the entry, shown where the household is set up. */
function FamilyListingRule() {
  const t = useTranslations();
  const locale = useLocale() === "en" ? "en" : "ar";
  const note = noteById("familyListing", locale);
  if (!note) return null;
  return <RuleNote note={note} sourceWord={t("guide.source")} />;
}
