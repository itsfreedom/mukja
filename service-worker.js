const CACHE_NAME = "mokja-alley-v65";
const ASSETS = [
  "index.html",
  "reset-cache.html",
  "order.html",
  "history.html",
  "menu.html",
  "admin.html",
  "recipes.html",
  "style.css",
  "app.js",
  "order.js",
  "history.js",
  "menu.js",
  "admin.js",
  "recipes.js",
  "storage.js",
  "i18n.js",
  "manifest.json",
  "data/items.json"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(new Request(event.request, { cache: "reload" }))
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("index.html")))
    );
    return;
  }

  if (["document", "script", "style"].includes(event.request.destination)) {
    event.respondWith(
      fetch(new Request(event.request, { cache: "reload" }))
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("index.html")))
  );
});
