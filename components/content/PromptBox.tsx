"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Icon } from "@/components/Icon";

type CopyState = "idle" | "copied" | "failed";

/** A text the person copies into an AI assistant. The prompt is Arabic, so it stays right to left. */
export function PromptBox({ text }: { text: string }) {
  const t = useTranslations("english");
  const [state, setState] = useState<CopyState>("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <div className="prompt">
      <div className="ph">
        <h3>{t("promptHeading")}</h3>
        <button type="button" className="icbtn" aria-label={t("copyAria")} onClick={() => void copy()}>
          <Icon name="copy" />
          {t("copy")}
        </button>
      </div>
      <div
        className="pt prompt-text"
        dir="rtl"
        lang="ar"
        tabIndex={0}
        role="region"
        aria-label={t("promptHeading")}
      >
        {text}
      </div>
      <div className="help">{t("promptHelp")}</div>
      <div className={state === "failed" ? "errt" : "help"} role="status">
        {state === "copied" ? t("copied") : state === "failed" ? t("copyFailed") : ""}
      </div>
    </div>
  );
}
