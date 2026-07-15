/* ==========================================================================
   CODE-KATZE · sw.js  ·  Service Worker (PWA)
   --------------------------------------------------------------------------
   Macht das Spiel offline spielbar. Strategie:
   - HTML/CSS/JS: "network first" – Updates kommen sofort an, offline wird
     auf den Cache zurückgegriffen. (Vorher war ALLES cache-first: Wer die
     App installiert hatte, bekam ohne Versions-Bump NIE wieder Updates.)
   - Icons & Co.: "cache first" – die ändern sich praktisch nie.

   Die CACHE_VERSION trotzdem bei Releases erhöhen: Sie räumt alte Caches
   weg und erneuert die Offline-Kopien in einem Rutsch.
   ========================================================================== */

'use strict';

const CACHE_VERSION = 'codekatze-v2';

const DATEIEN = [
  '.',
  'index.html',
  'style.css',
  'game.js',
  'levels.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
];

// Diese Dateien werden bevorzugt frisch aus dem Netz geladen (Updates!).
const NETZ_ZUERST = new Set(['', 'index.html', 'style.css', 'game.js',
  'levels.js', 'manifest.webmanifest']);

// Installieren: alle Spieldateien in den Cache legen.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(DATEIEN))
      .then(() => self.skipWaiting())
  );
});

// Aktivieren: alte Cache-Versionen aufräumen.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(
        namen
          .filter((name) => name.startsWith('codekatze-') && name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

/** Antwort cachen, wenn sie in Ordnung ist und vom eigenen Ursprung kommt. */
function cacheAntwort(request, antwort) {
  if (antwort && antwort.ok && request.url.startsWith(self.location.origin)) {
    const kopie = antwort.clone();
    caches.open(CACHE_VERSION).then((cache) => cache.put(request, kopie));
  }
  return antwort;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const dateiname = url.pathname.split('/').pop();
  const netzZuerst = url.origin === self.location.origin
    && NETZ_ZUERST.has(dateiname);

  if (netzZuerst) {
    // Netz zuerst: So kommen Spiel-Updates sofort an. Schlägt das Netz
    // fehl (offline), antwortet der Cache.
    event.respondWith(
      fetch(event.request)
        .then((antwort) => cacheAntwort(event.request, antwort))
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Alles andere (Icons …): zuerst aus dem Cache, sonst Netz + cachen.
  event.respondWith(
    caches.match(event.request).then((treffer) => {
      if (treffer) return treffer;
      return fetch(event.request)
        .then((antwort) => cacheAntwort(event.request, antwort));
    })
  );
});
