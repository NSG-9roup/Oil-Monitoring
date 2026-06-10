self.addEventListener('push', (event) => {
  let data = { title: 'OilTrack Notification', body: 'Update terbaru dari OilTrack.' }
  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data = { title: 'OilTrack Notification', body: event.data.text() }
    }
  }

  const options = {
    body: data.body,
    icon: 'https://i.imgur.com/8nqsjFz.png',
    badge: 'https://i.imgur.com/8nqsjFz.png',
    data: data.url || '/',
    vibrate: [100, 50, 100],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const urlToOpen = event.notification.data || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
