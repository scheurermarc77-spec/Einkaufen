const CACHE = "family-shop-v1";
const ASSETS = ["./","./index.html","./styles.css","./app.js","./products.js","./config.js","./manifest.webmanifest"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener("fetch", e => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
