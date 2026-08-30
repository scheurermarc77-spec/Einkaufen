const CACHE = "family-shop-v14";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=14",
  "./app.js?v=14",
  "./products.js?v=14",
  "./config.js?v=14",
  "./manifest.webmanifest"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith("family-shop-") && k !== CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Netzwerk zuerst: neue GitHub-Version wird bevorzugt, Cache nur bei Offline.
self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request, { cache: "no-store" })
      .then(response => response)
      .catch(() => caches.match(e.request))
  );
});
