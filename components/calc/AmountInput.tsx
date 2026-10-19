"use client";

import { useId, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Icon } from "@/components/Icon";
import { Link } from "@/i18n/navigation";
import type { Scaling } from "@/lib/calc/catalog";
import type { FieldCurrency } from "@/lib/calc/currency";
import type { AmountField } from "@/lib/calc/model";
import type { FieldPatch } from "@/lib/calc/plan-actions";

interface AmountInputProps {
  label: string;
  field: AmountField;
  localCode: string;
  onChange: (patch: FieldPatch) => void;
  /** How the typed amount grows with the household; shown as a small badge. */
  scaling?: Scaling | undefined;
  /** Lets the user switch between "whole household" and "per person". */
  hasToggle?: boolean | undefined;
  /** The item id of the "How do I find this price?" page, when it has one. */
  guideItemId?: string | undefined;
  invalid?: boolean | undefined;
  needsRate?: boolean | undefined;
  /** A line shown under the box, such as what the amount is multiplied by. */
  note?: ReactNode;
  /** One line under the name that says what the box covers ("Includes: ..."). */
  includes?: string | undefined;
}

/** One money box: label, dollar/local switch, the number, and the "how do I know the price?" button. */
export function AmountInput(props: AmountInputProps) {
  const { label, field, localCode, onChange, scaling, hasToggle, guideItemId, invalid, needsRate, note } =
    props;
  const { includes } = props;
  const t = useTranslations();
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const includesId = `${inputId}-includes`;
  const message = fieldMessage(t, invalid === true, needsRate === true);

  return (
    <div className="field">
      <div className="label">
        <label htmlFor={inputId}>{label}</label>
        {hasToggle ? (
          <PerPersonToggle
            isPerPerson={field.perPerson === true}
            onChange={(perPerson) => onChange({ perPerson })}
          />
        ) : (
          <ScalingBadge scaling={scaling} />
        )}
      </div>
      <IncludesLine id={includesId} text={includes} />
      <div className={invalid ? "input err" : "input"}>
        <CurrencySwitch
          value={field.currency}
          localCode={localCode}
          onChange={(currency) => onChange({ currency })}
        />
        <input
          id={inputId}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={field.raw}
          aria-invalid={invalid === true}
          aria-describedby={describedBy(
            includes === undefined ? null : includesId,
            message === null ? null : messageId,
          )}
          onChange={(event) => onChange({ raw: event.target.value })}
        />
      </div>
      {note}
      {guideItemId === undefined ? null : (
        <Link className="guide" href={`/guide/${guideItemId}`}>
          <Icon name="guide" />
          {t("common.guide")}
        </Link>
      )}
      {message === null ? null : (
        <div id={messageId} className={invalid ? "errt" : "help"}>
          {message}
        </div>
      )}
    </div>
  );
}

type Translate = ReturnType<typeof useTranslations>;

/** The ids of the lines that describe the box, in one attribute; undefined when there are none. */
function describedBy(...ids: (string | null)[]): string | undefined {
  const present = ids.filter((id): id is string => id !== null);
  return present.length === 0 ? undefined : present.join(" ");
}

/** The one line under a box's name that says what it covers. */
function IncludesLine({ id, text }: { id: string; text: string | undefined }) {
  if (text === undefined) return null;
  return (
    <div id={id} className="help includes">
      {text}
    </div>
  );
}

function fieldMessage(t: Translate, invalid: boolean, needsRate: boolean): string | null {
  if (invalid) return t("calc.errors.invalid");
  if (needsRate) return t("calc.errors.needsRate");
  return null;
}

function ScalingBadge({ scaling }: { scaling: Scaling | undefined }) {
  const t = useTranslations("calc.scaling");
  if (scaling === undefined || scaling === "total") return null;
  return <span className="per">{t(scaling)}</span>;
}

interface CurrencySwitchProps {
  value: FieldCurrency;
  localCode: string;
  onChange: (currency: FieldCurrency) => void;
}

function CurrencySwitch({ value, localCode, onChange }: CurrencySwitchProps) {
  const t = useTranslations();
  return (
    <span className="cur" role="group" aria-label={t("calc.currencyChoice")}>
      <button
        type="button"
        className={value === "usd" ? "on" : undefined}
        aria-pressed={value === "usd"}
        aria-label={t("common.usdAria")}
        onClick={() => onChange("usd")}
      >
        $
      </button>
      <button
        type="button"
        className={value === "local" ? "on" : undefined}
        aria-pressed={value === "local"}
        aria-label={t("common.localAria")}
        onClick={() => onChange("local")}
      >
        {localCode}
      </button>
    </span>
  );
}

interface PerPersonToggleProps {
  isPerPerson: boolean;
  onChange: (perPerson: boolean) => void;
}

function PerPersonToggle({ isPerPerson, onChange }: PerPersonToggleProps) {
  const t = useTranslations();
  return (
    <span className="pp" role="group" aria-label={t("calc.toggle.label")}>
      <button
        type="button"
        className={isPerPerson ? "on" : undefined}
        aria-pressed={isPerPerson}
        onClick={() => onChange(true)}
      >
        {t("common.one")}
      </button>
      <button
        type="button"
        className={isPerPerson ? undefined : "on"}
        aria-pressed={!isPerPerson}
        onClick={() => onChange(false)}
      >
        {t("common.all")}
      </button>
    </span>
  );
}
