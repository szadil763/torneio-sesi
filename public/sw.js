// Service Worker — notificações push para pais/alunos
// Recebe eventos push do Firebase Cloud Messaging e exibe notificação.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) {}

  const titulo   = data.notification?.title || data.title || 'Torneio SESI';
  const corpo    = data.notification?.body  || data.body  || 'Novo comunicado disponível!';
  const icone    = data.notification?.icon  || '/torneio-sesi.jpg';
  const url      = data.notification?.click_action || data.url || '/insignias/comunicados.html';

  e.waitUntil(
    self.registration.showNotification(titulo, {
      body:    corpo,
      icon:    icone,
      badge:   '/torneio-sesi.jpg',
      tag:     'torneio-comunicado',
      renotify: true,
      data:    { url },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/insignias/comunicados.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes('/insignias/comunicados') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
