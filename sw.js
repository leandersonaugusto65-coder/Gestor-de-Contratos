
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Basic fetch handler needed for PWA install eligibility
  event.respondWith(fetch(event.request).catch(() => {
    return new Response("Offline");
  }));
});
