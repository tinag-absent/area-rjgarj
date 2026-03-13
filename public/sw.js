const CACHE_NAME = 'kaishoku-v1';

// [SECURITY FIX #10] キャッシュするのは完全に公開された静的アセットのみ。
// 認証が必要なページや API レスポンスはキャッシュしない。
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// [SECURITY FIX #10] キャッシュを絶対に行わないパスのプレフィックス一覧
const NO_CACHE_PREFIXES = [
  '/api/',      // API レスポンスはキャッシュしない
  '/profile',   // 個人情報ページ
  '/chat',      // チャットログ
  '/entities',  // レベルゲート付きコンテンツ
  '/codex',
  '/missions',
  '/announcements',
];

function shouldSkipCache(url) {
  const { pathname } = new URL(url);
  return NO_CACHE_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

// インストール時: 静的アセットのみキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// アクティベート時: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// フェッチ時: 認証・個人情報に関わるパスはキャッシュをバイパス
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // [SECURITY FIX #10] API・認証必須ページはネットワーク直通（キャッシュ読み書き不可）
  if (url.pathname.startsWith('/api/') || shouldSkipCache(request.url)) {
    event.respondWith(
      fetch(request).catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }

  // GET のみ、かつ no-store / no-cache 指示がない場合のみキャッシュ利用
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          // [SECURITY FIX #10] Cache-Control: no-store / private なレスポンスはキャッシュしない
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const cc = response.headers.get('Cache-Control') ?? '';
          if (cc.includes('no-store') || cc.includes('private') || cc.includes('no-cache')) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
    );
  }
});
