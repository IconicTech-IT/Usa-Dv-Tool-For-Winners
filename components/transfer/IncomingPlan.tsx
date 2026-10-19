"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { UsdAmount } from "@/components/calc/DualAmount";
import { useNumberLocale } from "@/components/calc/format";
import { useDialogOpen } from "@/components/use-dialog-open";
import { summarizePlan } from "@/lib/calc/compare";
import { formatNumber } from "@/lib/calc/parse-amount";
import { planStore } from "@/lib/calc/plan-store";
import { decodePlanFragment, FRAGMENT_KEY, type DecodeResult } from "@/lib/transfer/codec";

type Outcome = { kind: "added"; name: string } | { kind: "full" } | null;

/**
 * Opening a link that carries a plan (`#p=...`) only OFFERS to add it. The part after the "#" is taken
 * off the address at once, and nothing is added or changed until the person agrees. A plan that
 * arrives is added next to his plans under its own name; it never replaces one.
 */
export function IncomingPlan() {
  const [offer, setOffer] = useState<DecodeResult | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);

  useEffect(() => {
    const check = () => {
      const hash = window.location.hash;
      if (!hash.startsWith(`#${FRAGMENT_KEY}=`)) return;
      // The plan is read into memory and the "#" part leaves the address bar and the history.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      void decodePlanFragment(hash).then((result) => {
        setOutcome(null);
        setOffer(result);
      });
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  if (offer === null) return null;
  return (
    <IncomingDialog offer={offer} outcome={outcome} onOutcome={setOutcome} onClose={() => setOffer(null)} />
  );
}

interface IncomingDialogProps {
  offer: DecodeResult;
  outcome: Outcome;
  onOutcome: (outcome: Outcome) => void;
  onClose: () => void;
}

function IncomingDialog({ offer, outcome, onOutcome, onClose }: IncomingDialogProps) {
  const t = useTranslations("transfer");
  const ref = useRef<HTMLDialogElement>(null);
  useDialogOpen(ref, true);

  const add = () => {
    if (!offer.ok) return;
    const name = offer.plan.name !== "" ? offer.plan.name : t("fromOtherDevice");
    if (planStore.actions.importPlan({ ...offer.plan, name })) {
      onOutcome({ kind: "added", name: planStore.getSnapshot().plan.name });
    } else {
      onOutcome({ kind: "full" });
    }
  };

  return (
    <dialog ref={ref} className="sheet-dialog" aria-labelledby="incoming-title" onClose={onClose}>
      <div className="sheet">
        <div className="sh">
          <span id="incoming-title">{offer.ok ? t("offerTitle") : t("brokenTitle")}</span>
          <button type="button" onClick={onClose}>
            {t("close")}
          </button>
        </div>
        <div className="body">
          <IncomingBody offer={offer} outcome={outcome} onAdd={add} onClose={onClose} />
        </div>
      </div>
    </dialog>
  );
}

interface IncomingBodyProps {
  offer: DecodeResult;
  outcome: Outcome;
  onAdd: () => void;
  onClose: () => void;
}

function IncomingBody({ offer, outcome, onAdd, onClose }: IncomingBodyProps) {
  const t = useTranslations("transfer");
  const plans = useTranslations("plans");
  const locale = useNumberLocale();

  if (!offer.ok) return <div className="note">{t("broken")}</div>;
  if (outcome?.kind === "added") return <div className="note">{t("added", { name: outcome.name })}</div>;
  if (outcome?.kind === "full") return <div className="errt">{plans("full")}</div>;

  const name = offer.plan.name !== "" ? offer.plan.name : t("fromOtherDevice");
  const summary = summarizePlan(name, offer.plan);
  return (
    <>
      <p>{t("offerLead")}</p>
      <dl className="offer">
        <dt>{t("offerName")}</dt>
        <dd>{name}</dd>
        <dt>{t("offerHousehold")}</dt>
        <dd className="num">
          {formatNumber(summary.adults, locale, 0)} + {formatNumber(summary.children, locale, 0)}
        </dd>
        <dt>{t("offerOneOff")}</dt>
        <dd>
          <UsdAmount cents={summary.oneTimeCents} />
        </dd>
        <dt>{t("offerMonthly")}</dt>
        <dd>
          <UsdAmount cents={summary.monthlyCents} />
        </dd>
      </dl>
      <div className="row2" style={{ marginTop: 14 }}>
        <button type="button" className="btn pr" onClick={onAdd}>
          {t("add")}
        </button>
        <button type="button" className="btn sec" onClick={onClose}>
          {t("dismiss")}
        </button>
      </div>
    </>
  );
}
