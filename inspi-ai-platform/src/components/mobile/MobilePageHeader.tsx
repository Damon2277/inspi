'use client';

import React from 'react';

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * 移动端页面标题组件
 * 用于在页面内容中显示标题，替代顶部导航栏
 */
export function MobilePageHeader({ 
  title, 
  subtitle, 
  className = '' 
}: MobilePageHeaderProps) {
  const isHeroSection = className.includes('hero-section');
  
  return (
    <header className={`mobile-page-header ${className}`}>
      <h1 className={`mobile-page-title ${isHeroSection ? 'hero-title' : ''}`} data-testid="page-title">
        {title}
      </h1>
      {subtitle && (
        <p className="mobile-page-subtitle" data-testid="page-subtitle">
          {subtitle}
        </p>
      )}
    </header>
  );
}