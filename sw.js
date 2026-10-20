// Offline-Speicher: App startet auch ohne Netz (die Zeit braucht dann den letzten Abgleich)
const C = "rallye-timer-v10", FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))); self.clients.claim(); });
// Erst Netz (neueste Version), aber höchstens 3 s warten – bei schwachem Netz sofort die gespeicherte Version.
// Nur gute Antworten speichern, damit eine Fehlerseite nie die App ersetzt.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  const cached = () => caches.match(e.request).then(r => r || caches.match("index.html"));
  const net = fetch(e.request).then(r => {
    if (r && r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
    return r;
  });
  e.respondWith(new Promise(resolve => {
    let done = false;
    const give = r => { if (!done && r) { done = true; resolve(r); } };
    const t = setTimeout(() => cached().then(r => r ? give(r) : net.then(give, () => give(Response.error()))), 3000);
    net.then(r => {
      if (r.ok) { clearTimeout(t); give(r); }
      else cached().then(c => { clearTimeout(t); give(c || r); });
    }, () => { clearTimeout(t); cached().then(r => give(r || Response.error())); });
  }));
});
