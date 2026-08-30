const CACHE = "family-shop-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=15",
  "./app.js?v=15",
  "./products.js?v=15",
  "./config.js?v=15",
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

self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request, { cache: "no-store" })
      .catch(() => caches.match(e.request))
  );
});
