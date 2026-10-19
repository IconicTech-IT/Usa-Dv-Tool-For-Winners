"use client";

import { Analytics } from "@vercel/analytics/next";

import { redactVisit } from "@/lib/analytics";

/** The Vercel visit counter (page views only, no cookies), with the address cut to the page. */
export function SafeAnalytics() {
  return <Analytics beforeSend={redactVisit} />;
}
