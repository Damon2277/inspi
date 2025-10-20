'use client';

import React from 'react';

import { DesktopLayout, DesktopNavigation } from '@/components/desktop';
import { KeyboardNavigationProvider } from '@/components/providers/KeyboardNavigationProvider';
import { UserProvider } from '@/contexts/UserContext';
import { AuthProvider } from '@/shared/hooks/useAuth';

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
  className = '',
}: AppLayoutProps) {
  return (
    <AuthProvider>
      <UserProvider>
        <KeyboardNavigationProvider>
          <DesktopLayout
            className={className}
            header={showNavigation ? <DesktopNavigation /> : undefined}
          >
            {children}
          </DesktopLayout>
        </KeyboardNavigationProvider>
      </UserProvider>
    </AuthProvider>
  );
}
