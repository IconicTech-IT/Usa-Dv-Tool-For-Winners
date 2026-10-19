import { withoutFragmentAndQuery } from "@/lib/transfer/codec";

/** What the visit counter is allowed to send about a page view. */
export interface VisitEvent {
  type: "pageview" | "event";
  url: string;
}

/**
 * The visit counter sees the address of the page without the "#" part and without a query, so a
 * link that carries a plan can never reach it. No custom events are ever sent: nothing a person
 * typed (amounts, plan names) goes to any counter.
 */
export function redactVisit<T extends VisitEvent>(event: T): T {
  return { ...event, url: withoutFragmentAndQuery(event.url) };
}
