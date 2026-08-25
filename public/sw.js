/**
 * Service worker بسيط ومكتوب بالإيد — مفيش مكتبة.
 *
 * السبب: أي مكتبة PWA بتضيف حجم ومخاطر توافق، والمطلوب هنا بسيط:
 * الزائر اللي فتح صفحة مرة يقدر يفتحها تاني وهو offline. جمهور الموقع
 * إنترنته متقطع، ودي مش رفاهية.
 */

const VERSION = "dv-compass-v1";
const OFFLINE_URLS = ["/ar", "/en"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(OFFLINE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // أصول Next الثابتة: من الكاش على طول، وعمرها ما بتتغير من غير اسم جديد
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // الصفحات: الشبكة الأول، والكاش لو مفيش نت
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() =>
        caches.match(request).then((hit) => hit ?? caches.match("/ar")),
      ),
  );
});
