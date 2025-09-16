'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PWAInstallPrompt, IOSInstallPrompt } from './PWAInstallPrompt';

interface MobileLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
  className?: string;
  showPWAPrompt?: boolean;
  title?: string;
}

/**
 * 移动端布局组件
 * 现在使用统一的AppLayout，但保持向后兼容
 * @deprecated 建议直接使用 AppLayout 组件
 */
export function MobileLayout({
  children,
  showBottomNav = true,
  className = '',
  showPWAPrompt = true,
  title
}: MobileLayoutProps) {
  return (
    <AppLayout 
      showNavigation={showBottomNav}
      className={className}
    >
      {title && (
        <div className="mobile-page-header mb-4">
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        </div>
      )}
      
      {children}
      
      {/* PWA安装提示 */}
      {showPWAPrompt && (
        <>
          <PWAInstallPrompt />
          <IOSInstallPrompt />
        </>
      )}
    </AppLayout>
  );
}