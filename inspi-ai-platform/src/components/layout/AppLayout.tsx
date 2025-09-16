'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation/Navigation';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { DesktopLayout, DesktopNavigation } from '@/components/desktop';
import { PWAInstallPrompt } from '@/components/mobile/PWAInstallPrompt';
import { KeyboardNavigationProvider } from '@/components/providers/KeyboardNavigationProvider';
import { useResponsive } from '@/hooks/useResponsive';

interface AppLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  className?: string;
}

/**
 * 统一的应用布局组件
 * 根据设备类型自动适配移动端和桌面端布局
 */
export function AppLayout({
  children,
  showNavigation = true,
  className = ''
}: AppLayoutProps) {
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);

  // 防止hydration不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  // 在客户端挂载前显示基础布局
  if (!mounted) {
    return (
      <div className={`app-layout ${className}`}>
        <main className="app-main">
          <div className="app-container">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // 检查是否强制桌面端模式
  const isDesktopMode = className.includes('desktop-mode');

  return (
    <KeyboardNavigationProvider>
      {/* 移动端布局 */}
      {isMobile && !isDesktopMode ? (
        <MobileLayout showNavigation={showNavigation} className={className}>
          <PWAInstallPrompt />
          {children}
        </MobileLayout>
      ) : (
        /* 桌面端布局 */
        <DesktopLayout
          className={className}
          header={showNavigation ? <DesktopNavigation /> : undefined}
        >
          {children}
        </DesktopLayout>
      )}
    </KeyboardNavigationProvider>
  );
}