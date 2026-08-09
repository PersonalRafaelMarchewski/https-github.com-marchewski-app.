const CACHE_NAME = "marchewski-shell-v3";
const APP_SHELL = ["/login", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  // não espera todas as abas antigas fecharem pra assumir — sem isso, um
  // PWA que fica sempre aberto em segundo plano no celular nunca pega a
  // versão nova sozinho, mesmo com o deploy já no ar.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      ),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // só cuida do "esqueleto" do próprio app (mesma origem) — nunca mexe em
  // chamadas pra API de outro domínio (Supabase etc). Interceptar essas
  // chamadas e cair num cache que nunca guarda essas respostas fazia
  // requisições ao banco falharem silenciosamente às vezes, deixando a
  // agenda (e outras listas) aparecerem vazias mesmo com dado no servidor.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "Marchewski App", body: "" };
  try {
    data = event.data.json();
  } catch {
    // ignore payload parse errors, use defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
