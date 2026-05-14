// DamKoi Service Worker — Web Push notifications

self.addEventListener("push", (event) => {
  let data = { title: "DamKoi", body: "Price dropped!", url: "/" };
  try {
    data = event.data?.json() ?? data;
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icons/dk_logo.png",
      badge: "/icons/badge.png",
      tag: "damkoi-price-drop",
      renotify: true,
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (client.url === url && "focus" in client) return client.focus();
        }
        return clients.openWindow(url);
      })
  );
});
