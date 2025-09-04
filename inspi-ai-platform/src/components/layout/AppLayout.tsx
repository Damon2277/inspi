'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation/Navigation';
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

  return (
    <KeyboardNavigationProvider>
      <div className={`app-layout ${isMobile ? 'mobile' : 'desktop'} ${className}`}>
        {/* 导航组件 */}
        {showNavigation && <Navigation />}
        
        {/* 主内容区域 */}
        <main 
          id="main-content" 
          className={`app-main ${showNavigation ? 'with-navigation' : ''}`}
          tabIndex={-1}
        >
          <div className="app-container">
            {children}
          </div>
        </main>
      </div>
    </KeyboardNavigationProvider>
  );
}