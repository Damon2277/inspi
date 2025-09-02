/**
 * Service Worker for Inspi.AI PWA
 * 提供离线缓存和后台同步功能
 */

const CACHE_NAME = 'inspi-ai-v1.0.0';
const STATIC_CACHE_NAME = 'inspi-ai-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'inspi-ai-dynamic-v1.0.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/create',
  '/square',
  '/profile',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 需要缓存的API路径
const API_CACHE_PATTERNS = [
  /^\/api\/works/,
  /^\/api\/profile/,
  /^\/api\/square/
];

// 不需要缓存的路径
const EXCLUDE_PATTERNS = [
  /^\/api\/auth/,
  /^\/api\/magic\/generate/,
  /^\/api\/admin/
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 跳过非GET请求
  if (request.method !== 'GET') {
    return;
  }
  
  // 跳过不需要缓存的路径
  if (EXCLUDE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return;
  }
  
  // 处理静态资源
  if (STATIC_ASSETS.includes(url.pathname) || 
      url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // 处理API请求
  if (url.pathname.startsWith('/api/')) {
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      event.respondWith(networkFirst(request));
    }
    return;
  }
  
  // 处理页面请求
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/'));
    return;
  }
  
  // 其他资源使用缓存优先策略
  event.respondWith(cacheFirst(request));
});

// 缓存优先策略
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    
    // 如果是页面请求，返回离线页面
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    throw error;
  }
}

// 网络优先策略
async function networkFirst(request, fallbackUrl = null) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network request failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 如果有fallback URL，尝试返回fallback页面
    if (fallbackUrl) {
      const fallbackResponse = await caches.match(fallbackUrl);
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }
    
    throw error;
  }
}

// 后台同步 - 处理离线时的操作
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync-works') {
    event.waitUntil(syncWorks());
  }
  
  if (event.tag === 'background-sync-profile') {
    event.waitUntil(syncProfile());
  }
});

// 同步作品数据
async function syncWorks() {
  try {
    console.log('Service Worker: Syncing works data');
    
    // 获取离线时保存的操作
    const pendingOperations = await getStoredOperations('works');
    
    for (const operation of pendingOperations) {
      try {
        await fetch(operation.url, {
          method: operation.method,
          headers: operation.headers,
          body: operation.body
        });
        
        // 操作成功，从存储中移除
        await removeStoredOperation('works', operation.id);
        
        // 通知客户端同步成功
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              operation: operation
            });
          });
        });
        
      } catch (error) {
        console.error('Failed to sync operation:', operation, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// 同步个人资料数据
async function syncProfile() {
  try {
    console.log('Service Worker: Syncing profile data');
    // 实现个人资料同步逻辑
  } catch (error) {
    console.error('Profile sync failed:', error);
  }
}

// 获取存储的离线操作
async function getStoredOperations(type) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const response = await cache.match(`/offline-operations/${type}`);
    
    if (response) {
      return await response.json();
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get stored operations:', error);
    return [];
  }
}

// 移除已完成的操作
async function removeStoredOperation(type, operationId) {
  try {
    const operations = await getStoredOperations(type);
    const updatedOperations = operations.filter(op => op.id !== operationId);
    
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    await cache.put(
      `/offline-operations/${type}`,
      new Response(JSON.stringify(updatedOperations))
    );
  } catch (error) {
    console.error('Failed to remove stored operation:', error);
  }
}

// 推送通知
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : '您有新的消息',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
        icon: '/icons/action-explore.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/icons/action-close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Inspi.AI', options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 消息处理
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'STORE_OFFLINE_OPERATION') {
    storeOfflineOperation(event.data.operation);
  }
});

// 存储离线操作
async function storeOfflineOperation(operation) {
  try {
    const operations = await getStoredOperations(operation.type);
    operations.push({
      ...operation,
      id: Date.now().toString(),
      timestamp: Date.now()
    });
    
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    await cache.put(
      `/offline-operations/${operation.type}`,
      new Response(JSON.stringify(operations))
    );
    
    // 注册后台同步
    await self.registration.sync.register(`background-sync-${operation.type}`);
    
  } catch (error) {
    console.error('Failed to store offline operation:', error);
  }
}