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
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'ombra',
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
