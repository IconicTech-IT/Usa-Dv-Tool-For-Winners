"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Registers the service worker once the page has loaded, and offers an update when a new
 * version is waiting. The new version takes over only when the visitor taps "update", so it never
 * reloads the page while he is typing.
 */
export function ServiceWorker() {
  const t = useTranslations("pwa");
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const isUpdating = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const watch = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
        });
      });
    };

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(watch)
        .catch(() => {
          // The site works the same without the worker: only offline use is lost.
        });
    };

    // The first install also fires this event; only reload when the visitor asked for an update.
    const reload = () => {
      if (isUpdating.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", reload);

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => navigator.serviceWorker.removeEventListener("controllerchange", reload);
  }, []);

  if (waiting === null) return null;

  const update = () => {
    isUpdating.current = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <div className="update no-print" role="status">
      <span>{t("updateReady")}</span>
      <button type="button" className="btn pr" onClick={update}>
        {t("update")}
      </button>
    </div>
  );
}
