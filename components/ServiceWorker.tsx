"use client";

import { useEffect } from "react";

/** بيسجل الservice worker بعد ما الصفحة تخلص تحميل — مش قبلها. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // فشل التسجيل مش مشكلة — الموقع بيشتغل عادي من غيره
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
