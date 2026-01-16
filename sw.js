/**
 * MiniMax Translator - Service Worker
 * Provides offline capabilities and caching
 */

const CACHE_NAME = 'minimax-translator-v1';
const OFFLINE_URL = 'offline.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './icons/icon-72.png',
    './icons/icon-96.png',
    './icons/icon-128.png',
    './icons/icon-144.png',
    './icons/icon-152.png',
    './icons/icon-192.png',
    './icons/icon-384.png',
    './icons/icon-512.png'
];

// Cache strategies
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Pre-caching app shell assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('[ServiceWorker] Skip waiting');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[ServiceWorker] Pre-cache failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            return cacheName !== CACHE_NAME;
                        })
                        .map((cacheName) => {
                            console.log('[ServiceWorker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[ServiceWorker] Claiming clients');
                return self.clients.claim();
            })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // API requests - Network first, fall back to cache
    if (url.hostname.includes('api.minimax.chat') || 
        url.hostname.includes('googleapis.com')) {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // Static assets - Cache first, fall back to network
    event.respondWith(cacheFirst(request));
});

/**
 * Cache-first strategy
 * Try cache first, then network
 */
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            // Return cached response and update cache in background
            fetchAndCache(request);
            return cachedResponse;
        }
        
        // Not in cache, fetch from network
        const networkResponse = await fetch(request);
        
        // Cache the new response
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[Cache First] Error:', error);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            return cache.match('./index.html');
        }
        
        throw error;
    }
}

/**
 * Network-first strategy
 * Try network first, fall back to cache
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[Network First] Network failed, trying cache:', request.url);
        
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // For navigation requests, return offline page
        if (request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            return cache.match('./index.html');
        }
        
        // Return a basic error response
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'application/json' })
        });
    }
}

/**
 * Fetch and update cache
 */
async function fetchAndCache(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
    } catch (error) {
        console.error('[Fetch and Cache] Error:', error);
    }
}

// Background sync for offline translations
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Sync event:', event.tag);
    
    if (event.tag === 'sync-translations') {
        event.waitUntil(syncTranslations());
    }
});

/**
 * Sync pending translations when back online
 */
async function syncTranslations() {
    try {
        // Get pending translations from IndexedDB
        const pendingTranslations = await getPendingTranslations();
        
        for (const translation of pendingTranslations) {
            try {
                const response = await fetch('https://api.minimax.chat/v1/text/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${translation.apiKey}`
                    },
                    body: JSON.stringify({
                        source_lang: translation.sourceLang,
                        target_lang: translation.targetLang,
                        text: translation.text
                    })
                });
                
                if (response.ok) {
                    // Remove from pending
                    await removePendingTranslation(translation.id);
                    
                    // Notify the client
                    const clients = await self.clients.matchAll();
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'TRANSLATION_SYNCED',
                            originalText: translation.text,
                            id: translation.id
                        });
                    });
                }
            } catch (error) {
                console.error('[Sync] Translation failed:', error);
            }
        }
    } catch (error) {
        console.error('[Sync] Error:', error);
    }
}

/**
 * Get pending translations from IndexedDB
 */
async function getPendingTranslations() {
    // This is a simplified implementation
    // In production, you'd use proper IndexedDB operations
    return [];
}

/**
 * Remove pending translation from IndexedDB
 */
async function removePendingTranslation(id) {
    // This is a simplified implementation
    // In production, you'd use proper IndexedDB operations
}

// Push notifications for translation completed
self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push received');
    
    let data = {};
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'MiniMax Translator', body: event.data.text() };
        }
    }
    
    const options = {
        body: data.body || 'Translation completed',
        icon: './icons/icon-192.png',
        badge: './icons/icon-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: data.id || 1
        },
        actions: [
            { action: 'view', title: 'View' },
            { action: 'close', title: 'Close' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(
            data.title || 'MiniMax Translator',
            options
        )
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[ServiceWorker] Notification click:', event.action);
    
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            self.clients.matchAll({ type: 'window' })
                .then((clientList) => {
                    // Focus existing window or open new one
                    for (const client of clientList) {
                        if (client.url.includes('index.html') && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    if (self.clients.openWindow) {
                        return self.clients.openWindow('./index.html');
                    }
                })
        );
    }
});

// Message handling from main app
self.addEventListener('message', (event) => {
    console.log('[ServiceWorker] Message received:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then((cache) => {
                    return cache.addAll(event.data.urls);
                })
        );
    }
    
    if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys()
                .then((cacheNames) => {
                    return Promise.all(
                        cacheNames.map((cacheName) => caches.delete(cacheName))
                    );
                })
        );
    }
});
