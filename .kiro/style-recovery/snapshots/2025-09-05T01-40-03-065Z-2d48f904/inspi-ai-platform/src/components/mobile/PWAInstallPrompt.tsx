'use client';

import React, { useState, useEffect } from 'react';
import { MobileCard } from './MobileCard';
import { MobileButton } from './MobileButton';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * PWA安装提示组件
 * 引导用户安装PWA应用
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 检查是否已经安装
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      // 检查是否在iOS Safari中以全屏模式运行
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return;
      }
    };

    checkInstalled();

    // 监听beforeinstallprompt事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // 延迟显示提示，让用户先体验应用
      setTimeout(() => {
        if (!isInstalled) {
          setShowPrompt(true);
        }
      }, 30000); // 30秒后显示
    };

    // 监听appinstalled事件
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

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
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // 24小时后再次显示
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  // 检查是否在24小时内被关闭过
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const now = Date.now();
      const hoursPassed = (now - dismissedTime) / (1000 * 60 * 60);
      
      if (hoursPassed < 24) {
        setShowPrompt(false);
        return;
      }
    }
  }, []);

  // 如果已安装或不显示提示，则不渲染
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <MobileCard className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">📱</div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">
              安装Inspi.AI应用
            </h3>
            <p className="text-white/90 text-sm mb-3">
              安装到主屏幕，获得更好的使用体验，支持离线访问
            </p>
            <div className="flex space-x-2">
              <MobileButton
                variant="secondary"
                size="sm"
                onClick={handleInstallClick}
                className="bg-white text-indigo-600 hover:bg-gray-100 flex-1"
              >
                立即安装
              </MobileButton>
              <MobileButton
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                稍后
              </MobileButton>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/60 hover:text-white p-1"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </MobileCard>
    </div>
  );
}

/**
 * iOS Safari安装提示组件
 */
export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 检查是否是iOS Safari且未安装
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = (window.navigator as any).standalone === true;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isIOS && !isInStandaloneMode && isSafari) {
      // 延迟显示提示
      setTimeout(() => {
        const dismissed = localStorage.getItem('ios-install-prompt-dismissed');
        if (!dismissed || Date.now() - parseInt(dismissed) > 24 * 60 * 60 * 1000) {
          setShowPrompt(true);
        }
      }, 45000); // 45秒后显示
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ios-install-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <MobileCard className="p-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">🍎</div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">
              添加到主屏幕
            </h3>
            <p className="text-white/90 text-sm mb-3">
              点击分享按钮 <span className="inline-block mx-1">📤</span> 然后选择"添加到主屏幕"
            </p>
            <MobileButton
              variant="secondary"
              size="sm"
              onClick={handleDismiss}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              我知道了
            </MobileButton>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/60 hover:text-white p-1"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </MobileCard>
    </div>
  );
}