import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";

import ar from "../messages/ar.json";
import en from "../messages/en.json";
import { routing, type Locale } from "./routing";

/** A fixed map instead of a dynamic import keeps the messages typed and bundled. */
const MESSAGES = { ar, en } satisfies Record<Locale, unknown>;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return { locale, messages: MESSAGES[locale] };
});
