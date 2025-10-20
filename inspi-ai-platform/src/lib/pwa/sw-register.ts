/**
 * Service Worker注册和管理
 */

const notifyUpdateAvailable = (applyUpdate: () => void) => {
  if (typeof window === 'undefined') {
    return;
  }

  const event = new CustomEvent('inspi:sw-update-available', {
    cancelable: true,
    detail: { applyUpdate },
  });

  const shouldApplyImmediately = window.dispatchEvent(event);

  if (shouldApplyImmediately) {
    applyUpdate();
  }
};

export const registerServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration);

    // 监听更新
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 新版本可用
            console.log('New version available');

            notifyUpdateAvailable(() => {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            });
          }
        });
      }
    });

    // 监听控制器变化
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service Worker controller changed');
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
};

// 注销Service Worker
export const unregisterServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('Service Worker unregistered');
    }
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
  }
};

// 发送消息给Service Worker
export const sendMessageToSW = (message: any) => {
  if (typeof window === 'undefined' || !navigator.serviceWorker.controller) {
    return;
  }

  navigator.serviceWorker.controller.postMessage(message);
};

// 存储离线操作
export const storeOfflineOperation = (operation: {
  type: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}) => {
  sendMessageToSW({
    type: 'STORE_OFFLINE_OPERATION',
    operation,
  });
};

// 检查网络状态
export const isOnline = () => {
  return typeof window !== 'undefined' ? navigator.onLine : true;
};

// 网络状态监听器
export const addNetworkListener = (callback: (isOnline: boolean) => void) => {
  if (typeof window === 'undefined') return;

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// 请求通知权限
export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'not-supported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
};

// 显示本地通知
export const showNotification = (title: string, options?: NotificationOptions) => {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') {
    return;
  }

  return new Notification(title, {
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon.svg',
    ...options,
  });
};
