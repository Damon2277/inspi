'use client';

import React from 'react';

interface DesktopCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
  padding?: boolean;
}

/**
 * 桌面端卡片组件
 * 提供多种样式变体和尺寸选项
 */
export function DesktopCard({
  children,
  className = '',
  variant = 'default',
  size = 'md',
  hover = true,
  onClick,
  padding = true
}: DesktopCardProps) {
  const baseClasses = 'desktop-card';
  
  const variantClasses = {
    default: '',
    elevated: 'desktop-card-elevated',
    outlined: 'desktop-card-outlined'
  };

  const sizeClasses = {
    sm: 'desktop-card-sm',
    md: 'desktop-card-md',
    lg: 'desktop-card-lg'
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${padding ? sizeClasses[size] : ''}
    ${hover ? 'desktop-card-hover' : ''}
    ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 active:translate-y-0' : ''}
    ${className}
  `.trim();

  if (onClick) {
    return (
      <button className={classes} onClick={onClick}>
        {children}
      </button>
    );
  }

  return (
    <div className={classes}>
      {children}
    </div>
  );
}

/**
 * 桌面端卡片头部组件
 */
export function DesktopCardHeader({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-b border-gray-200 pb-4 mb-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * 桌面端卡片标题组件
 */
export function DesktopCardTitle({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  );
}

/**
 * 桌面端卡片内容组件
 */
export function DesktopCardContent({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-gray-600 ${className}`}>
      {children}
    </div>
  );
}

/**
 * 桌面端卡片底部组件
 */
export function DesktopCardFooter({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-t border-gray-200 pt-4 mt-4 ${className}`}>
      {children}
    </div>
  );
}