'use client';

import React from 'react';

interface DesktopLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  layout?: 'default' | 'sidebar' | 'full-width';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

/**
 * 桌面端布局组件
 * 提供多种布局模式和配置选项
 */
export function DesktopLayout({
  children,
  sidebar,
  header,
  className = '',
  layout = 'default',
  maxWidth = 'xl',
}: DesktopLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-3xl',
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    full: 'max-w-none',
  };

  if (layout === 'sidebar' && sidebar) {
    return (
      <div className={`desktop-layout flex ${className}`}>
        {/* 侧边栏 */}
        <aside className="desktop-sidebar">
          {sidebar}
        </aside>

        {/* 主内容区域 */}
        <main className="flex-1 min-h-screen">
          {header && (
            <header className="desktop-header">
              {header}
            </header>
          )}
          <div className={`desktop-container ${maxWidthClasses[maxWidth]}`}>
            {children}
          </div>
        </main>
      </div>
    );
  }

  if (layout === 'full-width') {
    return (
      <div className={`desktop-layout ${className}`}>
        {header && (
          <header className="desktop-header">
            {header}
          </header>
        )}
        <main className="desktop-main">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // 默认布局
  return (
    <div className={`desktop-layout ${className}`}>
      {header && (
        <header className="desktop-header">
          {header}
        </header>
      )}
      <main className="desktop-main">
        <div className={`desktop-container ${maxWidthClasses[maxWidth]}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
