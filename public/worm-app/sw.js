const CACHE = "worm-app-v2";
const PRECACHE = [
  "/worm-app",
  "/worm-app/manifest.webmanifest",
  "/worm-app/icon-192.png?v=2",
  "/worm-app/icon-512.png?v=2",
  "/worm-app/apple-touch-icon.png?v=2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for app shell + API; cache-first for static icons.
  if (url.pathname.startsWith("/worm-app/icon") || url.pathname.startsWith("/worm-app/apple") || url.pathname.endsWith(".webmanifest")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })),
    );
    return;
  }

  if (url.pathname === "/worm-app" || url.pathname.startsWith("/worm-app/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/worm-app"))),
    );
  }
});
