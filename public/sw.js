/**
 * The service worker: a visitor who opened the site once can open it again without internet.
 * Hand-written, no library, small on purpose.
 *
 * - Pages and their build files are saved at install, so every calculator works offline.
 * - Build files (/_next/static/, hashed names) come from the cache first; they never change
 *   without a new name.
 * - Pages come from the network first and fall back to the saved copy, then to the offline page.
 * - A new worker installs in the background and WAITS. It takes over only when the visitor taps
 *   "update" (the page then sends SKIP_WAITING), so an update never cuts into what he is typing.
 * - Nothing personal is ever cached: the site has no accounts and no API. The numbers he types live
 *   in his own browser storage, not in this cache.
 */

const VERSION = "dv-compass-v2-1";

// Keep this list equal to the pages of the site (lib/routes.ts); a test checks it.
const PAGE_PATHS = [
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
  "/offline",
];
const LOCALES = ["ar", "en"];
const DEFAULT_LOCALE = "ar";

const PRECACHE_PAGES = LOCALES.flatMap((locale) => PAGE_PATHS.map((path) => `/${locale}${path}`));
const STATIC_ASSET = /\/_next\/static\/[^"'\s)\\]+/g;

function localeOf(pathname) {
  return (
    LOCALES.find((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) ?? DEFAULT_LOCALE
  );
}

/** Saves one page and the build files it names. */
async function precachePage(cache, path) {
  const response = await fetch(path, { cache: "reload" });
  if (!response.ok) return;
  const html = await response.clone().text();
  await cache.put(path, response);
  const assets = new Set(html.match(STATIC_ASSET) ?? []);
  await Promise.all(
    [...assets].map(async (asset) => {
      if (await cache.match(asset)) return;
      const assetResponse = await fetch(asset);
      if (assetResponse.ok) await cache.put(asset, assetResponse);
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      Promise.all(
        PRECACHE_PAGES.map((path) =>
          precachePage(cache, path).catch(() => {
            // One page that cannot be saved must not stop the others.
          }),
        ),
      ),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(VERSION);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(VERSION);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const hit = await caches.match(request);
    if (hit) return hit;
    const offline = await caches.match(`/${localeOf(new URL(request.url).pathname)}/offline`);
    return offline ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  }
});
