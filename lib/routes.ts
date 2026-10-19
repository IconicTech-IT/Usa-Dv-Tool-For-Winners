/** Every public page of the site, without the language prefix ("" is the home page). */
export const PAGE_PATHS = [
  "",
  "/setup",
  "/fees",
  "/moving",
  "/runway",
  "/results",
  "/quick",
  "/compare",
  "/scam",
  "/charge",
  "/english",
  "/about",
  "/privacy",
  "/sources",
] as const;

export type PagePath = (typeof PAGE_PATHS)[number];
