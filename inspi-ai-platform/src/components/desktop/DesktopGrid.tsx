'use client';

import React from 'react';

interface DesktopGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  responsive?: boolean;
}

/**
 * 桌面端网格组件
 * 提供灵活的网格布局系统
 */
export function DesktopGrid({
  children,
  columns = 3,
  gap = 'md',
  className = '',
  responsive = true
}: DesktopGridProps) {
  const gapClasses = {
    sm: 'desktop-grid-gap-sm',
    md: 'desktop-grid-gap-md',
    lg: 'desktop-grid-gap-lg',
    xl: 'desktop-grid-gap-xl'
  };

  const getColumnClasses = () => {
    if (!responsive) {
      return `grid-cols-${columns}`;
    }

    // 响应式网格类
    const responsiveClasses = {
      1: 'desktop-grid-1',
      2: 'desktop-grid-2',
      3: 'desktop-grid-3',
      4: 'desktop-grid-4',
      5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
      6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
    };

    return responsiveClasses[columns];
  };

  const classes = `
    desktop-grid
    ${getColumnClasses()}
    ${gapClasses[gap]}
    ${className}
  `.trim();

  return (
    <div className={classes}>
      {children}
    </div>
  );
}

/**
 * 桌面端网格项组件
 */
export function DesktopGridItem({
  children,
  span = 1,
  className = ''
}: {
  children: React.ReactNode;
  span?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const spanClass = span ? `col-span-${span}` : '';
  
  return (
    <div className={`${spanClass} ${className}`}>
      {children}
    </div>
  );
}