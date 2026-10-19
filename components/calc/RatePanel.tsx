"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { CurrencySheet } from "@/components/calc/CurrencySheet";
import { Icon } from "@/components/Icon";
import { listCurrencies, parseRate, rateLookupUrl } from "@/lib/calc/currency";
import type { PlanView } from "@/lib/calc/use-plan";
import { useIsClient } from "@/lib/use-is-client";

// The unit in the label of the rate box: one dollar, not an amount of money.
const ONE_DOLLAR = 1;

interface RatePanelProps {
  view: PlanView;
}

/** The local currency and the exchange rate. The user types the rate; we never supply one. */
export function RatePanel({ view }: RatePanelProps) {
  const t = useTranslations("rate");
  const language = useLocale() === "ar" ? "ar" : "en";
  const isClient = useIsClient();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { localCurrency, rate } = view.plan;

  // Currency names come from the browser's own data, so the server cannot know them: show the code first.
  const name = useMemo(
    () => (isClient ? listCurrencies(language).find((o) => o.code === localCurrency)?.name : undefined),
    [isClient, language, localCurrency],
  );

  const isEmpty = rate.trim() === "";
  const isInvalid = !isEmpty && parseRate(rate) === null;
  const hint = isInvalid ? t("invalid") : isEmpty ? t("empty") : t("hint");

  return (
    <div className={isEmpty || isInvalid ? "rate empty" : "rate"}>
      <span className="lbl">{t("label")}</span>
      <button type="button" className="pick" aria-haspopup="dialog" onClick={() => setIsPickerOpen(true)}>
        <span className="k">{t("currencyLabel")}</span>
        <b>
          {name === undefined ? null : `${name} `}
          <span className="ltr">({localCurrency})</span>
        </b>
        <Icon name="chevronDown" />
      </button>
      <span className="eq">
        <span>{ONE_DOLLAR} USD =</span>
        <input
          inputMode="decimal"
          autoComplete="off"
          placeholder="—"
          value={rate}
          aria-label={t("aria")}
          aria-invalid={isInvalid}
          onChange={(event) => view.actions.setRate(event.target.value)}
        />
        <span>{localCurrency}</span>
      </span>
      <a className="btn sec" href={rateLookupUrl(localCurrency)} target="_blank" rel="noopener noreferrer">
        <Icon name="external" />
        {t("google")}
      </a>
      <span className="hint">{hint}</span>
      <CurrencySheet
        isOpen={isPickerOpen}
        selectedCode={localCurrency}
        onSelect={view.actions.setLocalCurrency}
        onClose={() => setIsPickerOpen(false)}
      />
    </div>
  );
}
