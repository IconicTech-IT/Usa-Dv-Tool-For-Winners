import type { MetadataRoute } from "next";

import { DIRECTION, routing } from "@/i18n/routing";

/** The web app manifest (served at /manifest.webmanifest): installable from the browser menu. */
export default function manifest(): MetadataRoute.Manifest {
  const lang = routing.defaultLocale;
  return {
    id: `/${lang}`,
    name: "DV Compass",
    short_name: "DV Compass",
    description: "حاسبة مجانية لقرعة الهجرة لأمريكا: اكتب مصاريفك بنفسك واحسب تحتاج كام.",
    start_url: `/${lang}`,
    scope: "/",
    display: "standalone",
    lang,
    dir: DIRECTION[lang],
    background_color: "#F4F6F8",
    theme_color: "#0F766E",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
