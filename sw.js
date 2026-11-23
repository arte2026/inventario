'use strict';

const CACHE_NAME = 'almacen-facil-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './gemini.css',
  './i18n.js',
  './script.js',
  './stock.js',
  './logo.png',
  './icon-192.png',
  './splash.png',
  './cubes.png',
  './Offside-Regular.ttf'
];
const SHELL_URLS = new Set(
  APP_SHELL.map(path => new URL(path, self.registration.scope).href)
);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(name => name.startsWith('almacen-facil-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(cached =>
          cached || caches.match(new URL('./index.html', self.registration.scope))
        )
      )
    );
    return;
  }

  if (!SHELL_URLS.has(url.href)) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
