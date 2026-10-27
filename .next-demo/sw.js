/* FamilleConnect — Service Worker : réception Web Push + gestion des clics */
const CACHE = "familleconnect-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.registration.navigationPreload?.disable?.();
      await self.clients.claim();
    })()
  );
});

// Réception du push : affichage de la notification système (même app fermée)
self.addEventListener("push", (event) => {
  let data = { title: "FamilleConnect", body: "Nouvelle notification familiale", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    tag: data.tag || "familleconnect",
    renotify: true,
    vibrate: data.critical ? [300, 100, 300, 100, 300] : [100, 50, 100],
    data: { url: data.url || "/" },
    actions: [
      { action: "open", title: "Ouvrir" },
    ],
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Clic sur la notification : ouvre/focus l'app sur la bonne page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if (new URL(client.url).pathname === url && "focus" in client) return client.focus();
      }
      if (clientList.length > 0 && "focus" in clientList[0]) {
        clientList[0].navigate(url);
        return clientList[0].focus();
      }
      return self.clients.openWindow(url);
    })()
  );
});
