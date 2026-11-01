// VIP Berber Yönetim — Minimal PWA Service Worker
// Enables Android / Chrome 'beforeinstallprompt' and standalone app launch.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Network-first pass-through so real-time Supabase & state stay fresh
});
