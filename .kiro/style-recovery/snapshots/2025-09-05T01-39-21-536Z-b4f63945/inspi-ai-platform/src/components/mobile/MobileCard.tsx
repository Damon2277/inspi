'use client';

import React from 'react';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: boolean;
}

/**
 * 移动端卡片组件
 */
export function MobileCard({
  children,
  className = '',
  onClick,
  padding = 'md',
  shadow = true
}: MobileCardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const baseClasses = `
    mobile-card-enhanced
    ${paddingClasses[padding]}
    ${shadow ? 'shadow-sm' : ''}
    ${onClick ? 'mobile-touch-feedback cursor-pointer' : ''}
    ${className}
  `.trim();

  if (onClick) {
    return (
      <button className={baseClasses} onClick={onClick}>
        {children}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {children}
    </div>
  );
}