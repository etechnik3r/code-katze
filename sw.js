/* ==========================================================================
   CODE-KATZE · sw.js  ·  Service Worker (PWA)
   --------------------------------------------------------------------------
   Macht das Spiel offline spielbar: Beim Installieren werden alle Dateien
   in den Cache gelegt; danach werden Anfragen zuerst aus dem Cache bedient
   ("cache first") – das Spiel besteht ja nur aus statischen Dateien.

   WICHTIG beim Veröffentlichen von Änderungen: die CACHE_VERSION erhöhen!
   Dann räumt der neue Service Worker den alten Cache automatisch weg.
   ========================================================================== */

'use strict';

const CACHE_VERSION = 'codekatze-v1';

const DATEIEN = [
  '.',
  'index.html',
  'style.css',
  'game.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
];

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

// Anfragen: zuerst aus dem Cache, sonst aus dem Netz (und dann cachen).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((treffer) => {
      if (treffer) return treffer;
      return fetch(event.request).then((antwort) => {
        // Nur einwandfreie Antworten aus dem eigenen Ursprung cachen.
        if (antwort && antwort.ok && event.request.url.startsWith(self.location.origin)) {
          const kopie = antwort.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, kopie));
        }
        return antwort;
      });
    })
  );
});
