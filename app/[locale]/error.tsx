"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

interface ErrorPageProps {
  reset: () => void;
}

/**
 * Shown when a page fails while running. It never shows the technical message to the
 * visitor, only a retry and a way home.
 */
export default function ErrorPage({ reset }: ErrorPageProps) {
  const t = useTranslations("errors");
  return (
    <>
      <h1>{t("errorTitle")}</h1>
      <p className="lead">{t("errorText")}</p>
      <div className="row2 mt-16">
        <button type="button" className="btn pr" onClick={reset}>
          {t("retry")}
        </button>
        <Link href="/" className="btn sec">
          {t("goHome")}
        </Link>
      </div>
    </>
  );
}
