const CACHE = 'felineos-gatil-cti-v75';
const ARQUIVOS_DO_APP = [
  './',
  './vetflow-manifest.webmanifest',
  './assets/vetflow-app-icon.svg',
  './assets/felineos-icon-180.png',
  './assets/felineos-icon-192.png',
  './assets/felineos-icon-512.png',
  './assets/felineos-icon-maskable-512.png',
  './assets/felineos-login-sol-v1.png',
  './assets/hero-gatil-cti-completo.png'
];
const RECURSOS_EXTERNOS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
  'https://unpkg.com/lucide@0.462.0/dist/umd/lucide.js',
  'https://cdn.jsdelivr.net/npm/lucide@0.462.0/dist/umd/lucide.js'
];
const URLS_EXTERNAS_PERMITIDAS = new Set(RECURSOS_EXTERNOS);

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll(ARQUIVOS_DO_APP);
      await Promise.all(RECURSOS_EXTERNOS.map((url) => cache.add(url).catch(() => null)));
    })
  );
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
  const recursoExternoPermitido = URLS_EXTERNAS_PERMITIDAS.has(url.href);
  if (url.origin !== self.location.origin && !recursoExternoPermitido) return;

  if (recursoExternoPermitido) {
    evento.respondWith(
      caches.match(evento.request).then((emCache) => {
        const atualizacao = fetch(evento.request)
          .then((resposta) => {
            if (resposta && (resposta.ok || resposta.type === 'opaque')) {
              caches.open(CACHE).then((cache) => cache.put(evento.request, resposta.clone()));
            }
            return resposta;
          })
          .catch(() => emCache);
        return emCache || atualizacao;
      })
    );
    return;
  }

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
