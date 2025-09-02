/**
 * PWA安装提示组件
 * 引导用户安装应用到主屏幕
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '@/hooks/useResponsive';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const { isMobile } = useResponsive();

  useEffect(() => {
    // 检测是否为iOS设备
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // 检测是否已安装PWA
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppMode = (window.navigator as any).standalone === true;
    setIsInstalled(isInStandaloneMode || isInWebAppMode);

    // 监听PWA安装提示事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // 延迟显示提示，避免打断用户
      setTimeout(() => {
        if (!isInstalled) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    // 监听PWA安装完成事件
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // iOS设备显示安装提示
    if (isIOSDevice && !isInStandaloneMode && !isInWebAppMode) {
      const hasShownIOSPrompt = localStorage.getItem('ios-install-prompt-shown');
      if (!hasShownIOSPrompt) {
        setTimeout(() => {
          setShowIOSPrompt(true);
        }, 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('用户接受了安装提示');
      } else {
        console.log('用户拒绝了安装提示');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('安装提示错误:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // 24小时后再次显示
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  const handleIOSDismiss = () => {
    setShowIOSPrompt(false);
    localStorage.setItem('ios-install-prompt-shown', 'true');
  };

  // 检查是否应该显示提示
  const shouldShowPrompt = () => {
    if (isInstalled || !isMobile) return false;
    
    const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (lastDismissed) {
      const dismissedTime = parseInt(lastDismissed);
      const now = Date.now();
      const hoursSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) return false;
    }
    
    return showPrompt;
  };

  if (!isMobile || isInstalled) return null;

  return (
    <>
      {/* Android/Chrome PWA安装提示 */}
      <AnimatePresence>
        {shouldShowPrompt() && deferredPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-20 left-4 right-4 z-50"
          >
            <div className="mobile-card bg-white border border-gray-200 shadow-xl">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📱</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    安装Inspi.AI到主屏幕
                  </h3>
                  <p className="text-xs text-gray-600 mb-3">
                    获得更好的使用体验，快速访问AI教学魔法师
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleInstallClick}
                      className="flex-1 bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      立即安装
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      稍后提醒
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
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

      {/* iOS Safari安装提示 */}
      <AnimatePresence>
        {showIOSPrompt && isIOS && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full bg-white rounded-t-xl p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📱</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  添加到主屏幕
                </h3>
                <p className="text-sm text-gray-600">
                  将Inspi.AI添加到主屏幕，获得原生应用般的体验
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">1</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">点击</span>
                    <div className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700">分享按钮</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">2</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">选择</span>
                    <div className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                      添加到主屏幕
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">3</span>
                  </div>
                  <span className="text-sm text-gray-700">点击"添加"完成安装</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleIOSDismiss}
                  className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  我知道了
                </button>
                <button
                  onClick={handleIOSDismiss}
                  className="flex-1 bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  好的
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}