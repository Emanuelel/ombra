// Imported into the generated service worker (via workbox.importScripts).
// Shows a notification on push and focuses/opens the app on click.
self.addEventListener('push', function (event) {
  var data = {}
  try {
    data = event.data.json()
  } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Ombra', {
      body: data.body || '',
      // Large icon: the full-colour crown. Badge: a monochrome PNG that Android
      // tints for the status bar (an SVG badge renders as a generic dot there).
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      tag: data.tag || 'ombra',
      // Re-alert (sound/vibration/heads-up) when a notification reuses a tag. Without this,
      // Android silently REPLACES the existing notification with no alert, so repeated pushes
      // that share a tag (e.g. the test push) appear to "do nothing". iOS re-alerts regardless.
      renotify: true,
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
