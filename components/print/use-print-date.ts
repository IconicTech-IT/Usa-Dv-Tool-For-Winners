"use client";

import { useEffect, useState } from "react";

/**
 * Today's date in the page language, set when the page opens and again just before printing. It is
 * empty on the server and on the first render, so the saved page never carries a stale date.
 */
export function usePrintDate(language: "ar" | "en"): string {
  const [date, setDate] = useState("");

  useEffect(() => {
    const tag = language === "ar" ? "ar-EG" : "en-US";
    const update = () => setDate(new Intl.DateTimeFormat(tag, { dateStyle: "long" }).format(new Date()));
    update();
    window.addEventListener("beforeprint", update);
    return () => window.removeEventListener("beforeprint", update);
  }, [language]);

  return date;
}
