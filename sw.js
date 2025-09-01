/**
 * クイック TODO アプリ - Service Worker
 * PWA対応、オフラインキャッシュ、自動更新機能
 */

const CACHE_NAME = 'quick-todo-v1.0.3'
const CACHE_FILES = [
  './',
  './index.html',
  './styles/main.css',
  './scripts/storage.js',
  './scripts/main.js',
  './manifest.json',
]

/**
 * Service Worker インストール時の処理
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing...')

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching files')
        return cache.addAll(CACHE_FILES)
      })
      .then(() => {
        console.log('[SW] Installation complete')
        return self.skipWaiting()
      })
      .catch(error => {
        console.error('[SW] Installation failed:', error)
      })
  )
})

/**
 * Service Worker アクティベート時の処理
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...')

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Activation complete')
        return self.clients.claim()
      })
      .catch(error => {
        console.error('[SW] Activation failed:', error)
      })
  )
})

/**
 * フェッチイベントの処理（キャッシュファーストストラテジー）
 */
self.addEventListener('fetch', event => {
  // GETリクエスト以外は無視
  if (event.request.method !== 'GET') {
    return
  }

  // サポートされていないスキームは早期に除外
  const unsupportedSchemes = [
    'chrome-extension:',
    'chrome-search:',
    'chrome:',
    'devtools:',
    'extension:',
    'moz-extension:',
    'safari-extension:',
    'ms-browser-extension:',
  ]

  if (unsupportedSchemes.some(scheme => event.request.url.startsWith(scheme))) {
    return
  }

  // HTTPSまたはHTTPスキームのみ処理
  try {
    const url = new URL(event.request.url)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return
    }
  } catch (error) {
    console.warn('[SW] Invalid URL in fetch event:', event.request.url)
    return
  }

  event.respondWith(
    caches
      .match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', event.request.url)
          return cachedResponse
        }

        console.log('[SW] Fetching from network:', event.request.url)
        return fetch(event.request)
          .then(response => {
            if (
              !response ||
              response.status !== 200 ||
              response.type !== 'basic'
            ) {
              return response
            }

            const responseToCache = response.clone()

            caches
              .open(CACHE_NAME)
              .then(cache => {
                if (shouldCache(event.request.url)) {
                  cache
                    .put(event.request, responseToCache)
                    .catch(cacheError => {
                      console.warn(
                        '[SW] Cache put failed:',
                        event.request.url,
                        cacheError
                      )
                    })
                }
              })
              .catch(cacheError => {
                console.warn('[SW] Cache open failed:', cacheError)
              })

            return response
          })
          .catch(error => {
            console.error('[SW] Fetch failed:', error)

            if (event.request.destination === 'document') {
              return caches.match('./index.html')
            }

            throw error
          })
      })
      .catch(error => {
        console.error('[SW] Cache match failed:', error)
        return fetch(event.request)
      })
  )
})

/**
 * メッセージイベントの処理
 */
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data)

  switch (event.data?.type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break

    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME })
      break

    case 'CLEAR_CACHE':
      clearAllCaches()
        .then(() => {
          event.ports[0].postMessage({ success: true })
        })
        .catch(error => {
          event.ports[0].postMessage({ success: false, error: error.message })
        })
      break
  }
})

/**
 * Push通知イベントの処理（将来の拡張用）
 */
self.addEventListener('push', event => {
  console.log('[SW] Push received')

  if (!event.data) {
    return
  }

  const options = {
    body: event.data.text(),
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'explore',
        title: '開く',
        icon: './icons/icon-192.png',
      },
      {
        action: 'close',
        title: '閉じる',
        icon: './icons/icon-192.png',
      },
    ],
  }

  event.waitUntil(self.registration.showNotification('クイック TODO', options))
})

/**
 * 通知クリックイベントの処理
 */
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click received')

  event.notification.close()

  if (event.action === 'explore') {
    event.waitUntil(self.clients.openWindow('./'))
  }
})

/**
 * バックグラウンド同期イベントの処理（将来の拡張用）
 */
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag)

  if (event.tag === 'todo-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

/**
 * キャッシュ対象URLかどうかを判定
 * @param {string} url - チェックするURL
 * @returns {boolean} キャッシュすべきかどうか
 */
function shouldCache(url) {
  try {
    const urlObj = new URL(url)

    // サポートされていないスキームを除外
    const unsupportedSchemes = [
      'chrome-extension:',
      'chrome-search:',
      'chrome:',
      'devtools:',
      'extension:',
      'moz-extension:',
      'safari-extension:',
      'ms-browser-extension:',
    ]

    if (unsupportedSchemes.some(scheme => url.startsWith(scheme))) {
      return false
    }

    // HTTPSまたはHTTPスキームのみ許可
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false
    }

    const excludePatterns = [
      /\/api\//,
      /\.(png|jpg|jpeg|gif|svg|ico)$/i,
      /analytics/,
      /tracking/,
    ]

    return !excludePatterns.some(pattern => pattern.test(urlObj.pathname))
  } catch (error) {
    console.warn('[SW] Invalid URL for caching:', url, error)
    return false
  }
}

/**
 * すべてのキャッシュをクリア
 * @returns {Promise} クリア処理のPromise
 */
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys()
    const deletePromises = cacheNames.map(cacheName => caches.delete(cacheName))
    await Promise.all(deletePromises)
    console.log('[SW] All caches cleared')
  } catch (error) {
    console.error('[SW] Failed to clear caches:', error)
    throw error
  }
}

/**
 * バックグラウンド同期処理（将来の拡張用）
 * @returns {Promise} 同期処理のPromise
 */
async function doBackgroundSync() {
  try {
    console.log('[SW] Performing background sync')

    return Promise.resolve()
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
    throw error
  }
}

/**
 * エラーハンドリング
 */
self.addEventListener('error', event => {
  console.error('[SW] Error:', event.error)
})

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled promise rejection:', event.reason)
  event.preventDefault()
})

console.log('[SW] Service Worker loaded')
