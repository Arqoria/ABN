// Service Worker minimal — installabilité PWA uniquement.
// Pass-through : aucune mise en cache, aucune logique offline. La file
// d'attente locale (IndexedDB/Dexie) et le Background Sync pour la saisie
// terrain hors-réseau sont volontairement hors scope ici, voir l'Étape 8
// du backlog (docs/Tasks.md).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Laisse chaque requête suivre son cours normal vers le réseau.
  event.respondWith(fetch(event.request));
});
