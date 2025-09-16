'use client';

import React from 'react';

interface DesktopButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

/**
 * 桌面端按钮组件
 * 优化了鼠标交互和键盘导航
 */
export function DesktopButton({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  onClick,
  type = 'button',
  className = ''
}: DesktopButtonProps) {
  const baseClasses = 'desktop-button';
  
  const variantClasses = {
    primary: 'desktop-button-primary',
    secondary: 'desktop-button-secondary',
    outline: 'desktop-button-outline',
    ghost: 'desktop-button-ghost'
  };

  const sizeClasses = {
    sm: 'desktop-button-sm',
    md: 'desktop-button-md',
    lg: 'desktop-button-lg'
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>加载中...</span>
        </div>
      );
    }

    if (icon) {
      return (
        <div className="flex items-center space-x-2">
          {iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
          {iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
        </div>
      );
    }

    return children;
  };

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {renderContent()}
    </button>
  );
}

/**
 * 桌面端按钮组
 */
export function DesktopButtonGroup({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="group" className={`flex space-x-3 ${className}`}>
      {children}
    </div>
  );
}