// ===== Le "service worker" =====
// C'est un petit programme qui tourne à côté de l'appli, même hors connexion.
// Il garde une copie des fichiers de l'appli dans une "cache" (une réserve).

const RESERVE = "quetes-v3"; // change ce numéro quand tu veux forcer une mise à jour
const FICHIERS = ["./", "index.html", "style.css", "app.js", "sync.js", "manifest.json",
                  "icones/icone-192.png", "icones/icone-512.png", "icones/icone-180.png"];

// 1. À l'installation : on remplit la réserve
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(RESERVE).then(c => c.addAll(FICHIERS)));
  self.skipWaiting();
});

// 2. À l'activation : on jette les vieilles réserves
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(noms =>
    Promise.all(noms.filter(n => n !== RESERVE).map(n => caches.delete(n)))));
  self.clients.claim();
});

// 3. À chaque demande de fichier : on essaie Internet d'abord (pour avoir la dernière version),
//    et si ça ne marche pas (hors connexion), on prend la copie de la réserve.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // On ne garde en réserve que les fichiers de l'appli (pas les échanges avec Supabase)
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(rep => {
        const copie = rep.clone();
        caches.open(RESERVE).then(c => c.put(e.request, copie));
        return rep;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

// 4. Quand on touche une notification : on ouvre l'appli
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(fenetres =>
    fenetres.length ? fenetres[0].focus() : self.clients.openWindow("./")));
});
