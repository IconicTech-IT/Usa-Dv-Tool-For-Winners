"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Icon } from "@/components/Icon";
import { useDialogOpen } from "@/components/use-dialog-open";
import { listCurrencies, searchCurrencies, type CurrencyOption } from "@/lib/calc/currency";

interface CurrencySheetProps {
  isOpen: boolean;
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

/** The full ISO 4217 list in a dialog: Arab currencies first, searchable by name or code. */
export function CurrencySheet({ isOpen, selectedCode, onSelect, onClose }: CurrencySheetProps) {
  const t = useTranslations("rate");
  const language = useLocale() === "ar" ? "ar" : "en";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [query, setQuery] = useState("");
  useDialogOpen(dialogRef, isOpen);

  const options = useMemo(() => (isOpen ? listCurrencies(language) : []), [isOpen, language]);
  const shown = useMemo(() => searchCurrencies(options, query), [options, query]);

  const close = () => {
    setQuery("");
    onClose();
  };
  const choose = (code: string) => {
    onSelect(code);
    close();
  };

  return (
    <dialog ref={dialogRef} className="sheet-dialog" aria-labelledby={titleId} onClose={close}>
      <div className="sheet">
        <SheetHeader titleId={titleId} onClose={close} />
        <label className="search">
          <Icon name="search" />
          <input
            type="search"
            value={query}
            placeholder={t("pickSearch")}
            aria-label={t("pickSearch")}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="options">
          <OptionGroup
            title={t("pickArab")}
            options={shown.filter((o) => o.group === "arab")}
            selectedCode={selectedCode}
            onChoose={choose}
          />
          <OptionGroup
            title={t("pickAll")}
            options={shown.filter((o) => o.group === "all")}
            selectedCode={selectedCode}
            onChoose={choose}
          />
        </div>
      </div>
    </dialog>
  );
}

function SheetHeader({ titleId, onClose }: { titleId: string; onClose: () => void }) {
  const t = useTranslations();
  return (
    <div className="sh">
      <span id={titleId}>{t("rate.pickTitle")}</span>
      <button type="button" onClick={onClose}>
        {t("common.close")}
      </button>
    </div>
  );
}

interface OptionGroupProps {
  title: string;
  options: CurrencyOption[];
  selectedCode: string;
  onChoose: (code: string) => void;
}

function OptionGroup({ title, options, selectedCode, onChoose }: OptionGroupProps) {
  if (options.length === 0) return null;
  return (
    <div role="group" aria-label={title}>
      <div className="grp" aria-hidden="true">
        {title}
      </div>
      {options.map((option) => (
        <button
          key={option.code}
          type="button"
          className={option.code === selectedCode ? "opt on" : "opt"}
          aria-pressed={option.code === selectedCode}
          onClick={() => onChoose(option.code)}
        >
          <span>{option.name}</span>
          <code>{option.code}</code>
        </button>
      ))}
    </div>
  );
}
