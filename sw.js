self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {}

  const title = String(data.title || 'Familien Einkauf');
  const options = {
    body: String(data.body || 'Es gibt Neuigkeiten.'),
    icon: 'icon-192.png?v=31',
    badge: 'icon-192.png?v=31',
    tag: 'family-shopping-update',
    renotify: true,
    data: { openApp: true }
  };

  const tasks = [self.registration.showNotification(title, options)];

  if (self.navigator && 'setAppBadge' in self.navigator) {
    tasks.push(self.navigator.setAppBadge(Number(data.badge || 1)).catch(() => {}));
  }

  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const tasks = [];
  if (self.navigator && 'clearAppBadge' in self.navigator) {
    tasks.push(self.navigator.clearAppBadge().catch(() => {}));
  }

  tasks.push(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(self.registration.scope).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(self.registration.scope) : undefined;
    })
  );

  event.waitUntil(Promise.all(tasks));
});
