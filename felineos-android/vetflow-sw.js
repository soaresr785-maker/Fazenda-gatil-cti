const CACHE = 'felineos-gatil-cti-v32';
const ARQUIVOS_DO_APP = [
  './',
  './vetflow-manifest.webmanifest',
  './assets/vetflow-app-icon.svg',
  './assets/felineos-icon-180.png',
  './assets/felineos-icon-192.png',
  './assets/felineos-icon-512.png',
  './assets/felineos-icon-maskable-512.png',
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

  if (evento.request.mode === 'navigate' || evento.request.destination === 'document') {
    evento.respondWith(
      fetch(evento.request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(evento.request, copia));
          return resposta;
        })
        .catch(() => caches.match(evento.request).then((emCache) => emCache || caches.match('./')))
    );
    return;
  }

  evento.respondWith(
    caches.match(evento.request).then((emCache) => {
      const atualizacao = fetch(evento.request)
        .then((resposta) => {
          if (resposta && resposta.ok) {
            const copia = resposta.clone();
            caches.open(CACHE).then((cache) => cache.put(evento.request, copia));
          }
          return resposta;
        })
        .catch(() => emCache);

      return emCache || atualizacao;
    })
  );
});
