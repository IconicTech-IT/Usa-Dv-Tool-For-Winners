"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Icon } from "@/components/Icon";
import { QrCode } from "@/components/transfer/QrCode";
import { useDialogOpen } from "@/components/use-dialog-open";
import { whatsappUrl } from "@/lib/calc/summary";
import type { PlanView } from "@/lib/calc/use-plan";
import { encodePlanFragment, isTransferSupported, MAX_QR_CHARS, transferUrl } from "@/lib/transfer/codec";

type Status = "idle" | "preparing" | "ready" | "too-big" | "unsupported";
type CopyState = "idle" | "copied" | "failed";

/** "Move to another device": a link with the plan after the "#" and a QR code, both made on this page. */
export function TransferDialog({ view }: { view: PlanView }) {
  const t = useTranslations("transfer");
  const locale = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [url, setUrl] = useState("");
  const [copy, setCopy] = useState<CopyState>("idle");
  useDialogOpen(dialogRef, isOpen);

  const open = async () => {
    setIsOpen(true);
    setCopy("idle");
    setStatus("preparing");
    const fragment = await encodePlanFragment(view.plan);
    if (fragment === null) {
      setStatus(isTransferSupported() ? "too-big" : "unsupported");
      return;
    }
    setUrl(transferUrl(window.location.origin, locale, fragment));
    setStatus("ready");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };

  return (
    <>
      <button type="button" className="btn sec no-print" onClick={() => void open()}>
        <Icon name="upload" />
        {t("open")}
      </button>
      <dialog
        ref={dialogRef}
        className="sheet-dialog"
        aria-labelledby="transfer-title"
        onClose={() => setIsOpen(false)}
      >
        <div className="sheet">
          <div className="sh">
            <span id="transfer-title">{t("title")}</span>
            <button type="button" onClick={() => setIsOpen(false)}>
              {t("close")}
            </button>
          </div>
          <div className="body">
            <p>{t("lead")}</p>
            <div className="warn">{t("warning")}</div>
            <TransferBody status={status} url={url} copy={copy} onCopy={() => void copyLink()} />
          </div>
        </div>
      </dialog>
    </>
  );
}

interface TransferBodyProps {
  status: Status;
  url: string;
  copy: CopyState;
  onCopy: () => void;
}

function TransferBody({ status, url, copy, onCopy }: TransferBodyProps) {
  const t = useTranslations("transfer");
  if (status === "preparing" || status === "idle") return <p className="help">{t("preparing")}</p>;
  if (status === "too-big") return <div className="note">{t("tooBig")}</div>;
  if (status === "unsupported") return <div className="note">{t("unsupported")}</div>;

  return (
    <>
      <div className="field">
        <label className="label" htmlFor="transfer-link">
          {t("linkLabel")}
        </label>
        <div className="input">
          <input
            id="transfer-link"
            readOnly
            value={url}
            dir="ltr"
            onFocus={(event) => event.target.select()}
          />
        </div>
      </div>
      <div className="row2" style={{ marginTop: 10 }}>
        <button type="button" className="btn sec" onClick={onCopy}>
          <Icon name="copy" />
          {t("copy")}
        </button>
        <a
          className="btn wa"
          href={whatsappUrl(`${t("whatsappText")}\n${url}`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="whatsapp" />
          {t("whatsapp")}
        </a>
      </div>
      <div className={copy === "failed" ? "errt" : "help"} role="status">
        {copy === "copied" ? t("copied") : copy === "failed" ? t("copyFailed") : ""}
      </div>
      {url.length <= MAX_QR_CHARS ? (
        <>
          <h3 className="qr-title">{t("qrHeading")}</h3>
          <QrCode text={url} label={t("qrLabel")} />
        </>
      ) : (
        <div className="note">{t("qrTooBig")}</div>
      )}
    </>
  );
}
