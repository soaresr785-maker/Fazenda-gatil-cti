const CACHE = 'felineos-gatil-cti-v20';
const ARQUIVOS_DO_APP = [
  './vetflow-moderno.html',
  './vetflow-manifest.webmanifest',
  './assets/vetflow-app-icon.svg',
  './assets/hero-gatil-cti-completo.png'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS_DO_APP)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) => Promise.all(
      chaves.filter((chave) => /^(vetflow-feline-|vetflow-gatil-cti-|felineos-gatil-cti-)/.test(chave) && chave !== CACHE)
        .map((chave) => caches.delete(chave))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  const url = new URL(evento.request.url);
  if (url.origin !== self.location.origin) return;

  evento.respondWith(
    caches.match(evento.request).then((emCache) => {
      if (emCache) return emCache;
      return fetch(evento.request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(evento.request, copia));
          return resposta;
        })
        .catch(() => caches.match('./vetflow-moderno.html'));
    })
  );
});
