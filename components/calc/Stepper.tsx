"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

import { useNumberLocale } from "@/components/calc/format";
import { formatNumber } from "@/lib/calc/parse-amount";

interface StepperProps {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

/** A whole number with minus and plus buttons (adults, children, buffer months). */
export function Stepper({ label, help, value, min, max, onChange }: StepperProps) {
  const t = useTranslations("common");
  const locale = useNumberLocale();
  const labelId = useId();

  return (
    <div className="field" role="group" aria-labelledby={labelId}>
      <div className="label" id={labelId}>
        {label}
      </div>
      <div className="step">
        <span>{help}</span>
        <span className="ctl">
          <button
            type="button"
            aria-label={t("decrease")}
            disabled={value <= min}
            onClick={() => onChange(value - 1)}
          >
            −
          </button>
          <b className="num" aria-live="polite">
            {formatNumber(value, locale, 0)}
          </b>
          <button
            type="button"
            aria-label={t("increase")}
            disabled={value >= max}
            onClick={() => onChange(value + 1)}
          >
            +
          </button>
        </span>
      </div>
    </div>
  );
}
