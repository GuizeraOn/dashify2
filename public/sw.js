/**
 * Service worker do Dashify.
 *
 * Existe por dois motivos: o Chrome so oferece a instalacao do app quando ha
 * um service worker com handler de fetch, e ele garante que abrir o app
 * offline mostre a interface em vez da pagina de erro do navegador.
 *
 * Regra geral: nada de dado de negocio em cache. As rotas /api/ sempre vao na
 * rede — um dashboard financeiro mostrando numero velho e pior que um
 * dashboard vazio.
 */
const VERSION = 'v1';
const SHELL_CACHE = `dashify-shell-${VERSION}`;
const ASSET_CACHE = `dashify-assets-${VERSION}`;

const SHELL_URLS = [
  '/dashboard',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll falha inteiro se um item falhar; aqui cada um e opcional.
      await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('dashify-') && key !== SHELL_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

/** Rede primeiro, cache como rede de seguranca. Usado na navegacao. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Offline e sem nada guardado: devolve o shell do dashboard.
    const shell = await cache.match('/dashboard');
    if (shell) return shell;
    throw error;
  }
}

/** Cache primeiro. So para assets com hash no nome, que nunca mudam. */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Nada de outro dominio e nada de API entra em cache.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  const isHashedAsset = url.pathname.startsWith('/_next/static/');
  const isStaticFile = /\.(?:png|svg|ico|webmanifest|woff2?)$/.test(url.pathname);

  if (isHashedAsset || isStaticFile) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
  }
});
