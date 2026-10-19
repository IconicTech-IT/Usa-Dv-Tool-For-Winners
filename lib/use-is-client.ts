import { useSyncExternalStore } from "react";

/** There is nothing to subscribe to: the value only differs between the server and the browser. */
function subscribe(): () => void {
  return () => undefined;
}

/**
 * False on the server and during hydration, true afterwards in the browser.
 * Use it to render a neutral first paint when the real value is only known in the browser.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
