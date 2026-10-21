// Service Worker para República Caraquista PWA
const CACHE_NAME = "caraquista-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/favicon.ico",
  "/icon.png",
  "/icon-512.png",
  "/manifest.webmanifest",
  "/assets/logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn("SW: No se pudo precachear", asset, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Solo manejar solicitudes GET
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // No interceptar peticiones a la API o dominios externos en SW para datos frescos
  if (url.pathname.startsWith("/api/") || !url.origin.includes(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
      })
  );
});

// ==============================================================================
// GESTIÓN DE NOTIFICACIONES WEB PUSH
// ==============================================================================

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = {
    title: "República Caraquista",
    body: "Nueva actualización disponible",
    icon: "/icon-512.png",
    badge: "/favicon.ico",
    url: "/game-center",
    tag: "caraquista-notification",
  };

  try {
    const json = event.data.json();
    payload = {
      title: json.title || payload.title,
      body: json.body || payload.body,
      icon: json.icon || payload.icon,
      badge: json.badge || payload.badge,
      url: json.url || payload.url,
      tag: json.tag || payload.tag,
    };
  } catch {
    payload.body = event.data.text();
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: payload.url,
    },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            client.focus();
            if ("navigate" in client && targetUrl) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
