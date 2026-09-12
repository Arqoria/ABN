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
  // Ne jamais intercepter les requêtes avec un corps (POST des Server
  // Actions : connexion, inscription, tous les formulaires métier) —
  // rejouer un Request qui a un body via fetch(event.request) peut échouer
  // selon le navigateur (le body est un flux à usage unique), ce qui
  // bloquait silencieusement la connexion sur le site déployé. On ne fait
  // du pass-through explicite que pour les GET, sans bénéfice ni risque
  // pour les autres méthodes : on les laisse suivre leur cours nativement.
  if (event.request.method !== "GET") {
    return;
  }
  event.respondWith(fetch(event.request));
});
