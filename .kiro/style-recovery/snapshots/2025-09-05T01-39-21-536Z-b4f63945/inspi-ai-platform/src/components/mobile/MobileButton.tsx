'use client';

import React from 'react';

interface MobileButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

/**
 * 移动端按钮组件
 */
export function MobileButton({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = ''
}: MobileButtonProps) {
  const baseClasses = 'mobile-button-enhanced mobile-focus-visible';
  
  const variantClasses = {
    primary: 'mobile-button-primary-enhanced',
    secondary: 'mobile-button-secondary-enhanced',
    outline: 'mobile-button-outline-enhanced',
    ghost: 'text-gray-700 bg-transparent hover:bg-gray-100'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[40px]',
    md: 'px-4 py-3 text-base min-h-[48px]',
    lg: 'px-6 py-4 text-lg min-h-[56px]'
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="mobile-spinner mr-2" />
          加载中...
        </div>
      ) : (
        children
      )}
    </button>
  );
}