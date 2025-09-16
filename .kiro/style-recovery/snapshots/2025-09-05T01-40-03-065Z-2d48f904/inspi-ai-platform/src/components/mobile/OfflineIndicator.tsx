/**
 * 离线状态指示器
 * 显示网络连接状态和离线功能
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '@/hooks/useResponsive';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [hasBeenOffline, setHasBeenOffline] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [swStatus, setSWStatus] = useState<'installing' | 'waiting' | 'active' | 'none'>('none');
  const { isMobile } = useResponsive();

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (e.ctrlKey && e.key === 'x')) {
        setShowUpdatePrompt(false);
        setShowOfflineMessage(false);
        setSWStatus('none');
        localStorage.setItem('sw-update-dismissed', 'permanent');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // 初始化网络状态
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (hasBeenOffline) {
        // 显示重新连接消息
        setShowOfflineMessage(true);
        setTimeout(() => setShowOfflineMessage(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setHasBeenOffline(true);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [hasBeenOffline]);

  // 检查Service Worker状态

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.installing) {
          setSWStatus('installing');
        } else if (registration.waiting) {
          setSWStatus('waiting');
          // 检查是否应该显示更新提示
          const lastDismissed = localStorage.getItem('sw-update-dismissed');
          if (lastDismissed === 'permanent') {
            setShowUpdatePrompt(false);
          } else if (!lastDismissed || lastDismissed === 'false') {
            setShowUpdatePrompt(true);
          } else {
            const dismissedTime = parseInt(lastDismissed);
            if (!isNaN(dismissedTime)) {
              const now = Date.now();
              const hoursSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60);
              if (hoursSinceDismissed > 24) {
                setShowUpdatePrompt(true);
              }
            } else {
              setShowUpdatePrompt(true);
            }
          }
        } else if (registration.active) {
          setSWStatus('active');
        }
      });

      // 监听Service Worker状态变化
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setSWStatus('active');
        setShowUpdatePrompt(false);
      });
    }
  }, []);

  const handleDismiss = () => {
    setShowOfflineMessage(false);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleUpdateDismiss = () => {
    setShowUpdatePrompt(false);
    setSWStatus('none');
    localStorage.setItem('sw-update-dismissed', Date.now().toString());
  };

  const handleUpdateLater = () => {
    setShowUpdatePrompt(false);
    localStorage.setItem('sw-update-dismissed', Date.now().toString());
  };

  const handleNeverShow = () => {
    setShowUpdatePrompt(false);
    setSWStatus('none');
    localStorage.setItem('sw-update-dismissed', 'permanent');
  };

  return (
    <>
      {/* 网络状态指示器 */}
      <AnimatePresence>
        {showOfflineMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed top-4 left-4 right-4 z-50 ${isMobile ? 'top-16' : 'top-4'}`}
          >
            <div className={`
              mobile-card border-l-4 shadow-lg
              ${isOnline 
                ? 'bg-green-50 border-green-500' 
                : 'bg-orange-50 border-orange-500'
              }
            `}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${isOnline ? 'bg-green-100' : 'bg-orange-100'}
                  `}>
                    {isOnline ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12m6.364-6.364L12 12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className={`text-sm font-medium ${
                      isOnline ? 'text-green-800' : 'text-orange-800'
                    }`}>
                      {isOnline ? '网络已连接' : '网络连接中断'}
                    </h3>
                    <p className={`text-xs ${
                      isOnline ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {isOnline 
                        ? '您现在可以正常使用所有功能' 
                        : '部分功能可能无法使用，已保存的内容仍可访问'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    isOnline 
                      ? 'text-green-600 hover:text-green-800' 
                      : 'text-orange-600 hover:text-orange-800'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Service Worker更新提示 */}
      <AnimatePresence>
        {swStatus === 'waiting' && showUpdatePrompt && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-20 left-4 right-4 z-50"
          >
            <div className="mobile-card bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-800 mb-1">
                      应用更新可用
                    </h3>
                    <p className="text-xs text-blue-600">
                      发现新版本，刷新页面以获得最新功能
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleUpdateDismiss}
                  className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                  aria-label="关闭"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <button
                    onClick={handleRefresh}
                    className="flex-1 bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    立即刷新
                  </button>
                  <button
                    onClick={handleUpdateLater}
                    className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    稍后提醒
                  </button>
                </div>
                <button
                  onClick={handleNeverShow}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors py-1"
                >
                  不再提醒更新
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 持续的离线状态指示器 */}
      {!isOnline && (
        <div className={`
          fixed ${isMobile ? 'top-16' : 'top-4'} right-4 z-40
          bg-orange-500 text-white text-xs px-2 py-1 rounded-full
          flex items-center space-x-1 shadow-lg
        `}>
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span>离线</span>
        </div>
      )}
    </>
  );
}