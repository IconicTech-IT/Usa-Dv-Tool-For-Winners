"use client";

import "@/styles/globals.css";

interface GlobalErrorProps {
  reset: () => void;
}

/**
 * The last safety net: it replaces the whole page, so it brings its own html and body and
 * cannot use the translations. Both languages are written out.
 */
export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="wrap">
          <h1>حصلت مشكلة · Something went wrong</h1>
          <p className="lead">جرّب تحمّل الصفحة تاني. · Try loading the page again.</p>
          <button type="button" className="btn pr mt-16" onClick={reset}>
            جرّب تاني · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
