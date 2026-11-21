// KILL-SWITCH (21/11/2026): o Solara Bay não usa mais service worker.
// Motivo: o SW v34 guardava 'index.html' no cache; na Cloudflare /solara-bay/index.html responde 307 → /solara-bay/,
// então o cache ficava com uma resposta "redirecionada" e o Chrome recusa usá-la para abrir a página (ERR_FAILED).
// Este SW: instala na hora, apaga TODOS os caches, assume as abas, se desregistra e recarrega as abas abertas.
// Não tem handler de fetch: tudo vai direto para a rede.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); } catch (err) { }
    try { await self.clients.claim(); } catch (err) { }
    try { await self.registration.unregister(); } catch (err) { }
    try { const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); cs.forEach((c) => { try { c.navigate(c.url); } catch (err) { } }); } catch (err) { }
  })());
});
