const CACHE_NAME = "samity-cloud-pwa-v2";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// ১. ইনস্টল হওয়ার সময় মূল ফাইলগুলো ক্যাশ করা
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn("কিছু ফাইল ক্যাশ করা যায়নি:", err);
      });
    })
  );
  self.skipWaiting();
});

// ২. পুরনো ক্যাশ ভার্সন মুছে ফেলা
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ৩. রিকোয়েস্ট হ্যান্ডেল করা (Network-First, Offline Fallback to Cache)
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // শুধু GET রিকোয়েস্ট হ্যান্ডেল করা হবে (Cloud POST/PUT রিকোয়েস্ট অ্যাপের নিজস্ব কোড সামলাবে)
  if (request.method !== "GET") {
    return;
  }

  // ভিন্ন ডোমেইনের (যেমন কাস্টম Cloud API বা CDN) রিকোয়েস্ট বাইপাস করা
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
      })
  );
});
