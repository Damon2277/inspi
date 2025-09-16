'use client';

import React, { forwardRef } from 'react';

interface DesktopInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: 'text' | 'email' | 'password' | 'search' | 'textarea';
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  help?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

/**
 * 桌面端输入框组件
 * 优化了桌面端的交互体验
 */
export const DesktopInput = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  DesktopInputProps
>(({
  label,
  placeholder,
  value,
  onChange,
  onKeyPress,
  type = 'text',
  size = 'md',
  error,
  help,
  required = false,
  disabled = false,
  rows = 4,
  className = '',
  icon,
  iconPosition = 'left'
}, ref) => {
  const baseClasses = 'desktop-input';
  
  const sizeClasses = {
    sm: 'desktop-input-sm',
    md: '',
    lg: 'desktop-input-lg'
  };

  const inputClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${error ? 'desktop-input-error' : ''}
    ${icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : ''}
    ${className}
  `.trim();

  const renderInput = () => {
    if (type === 'textarea') {
      return (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className={inputClasses}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyPress={onKeyPress}
          required={required}
          disabled={disabled}
          rows={rows}
        />
      );
    }

    return (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        type={type}
        className={inputClasses}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyPress={onKeyPress}
        required={required}
        disabled={disabled}
      />
    );
  };

  return (
    <div className="desktop-form-group">
      {label && (
        <label className="desktop-form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className={`absolute inset-y-0 ${iconPosition === 'left' ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none`}>
            <span className="text-gray-400">
              {icon}
            </span>
          </div>
        )}
        {renderInput()}
      </div>
      
      {error && (
        <p className="desktop-form-error">
          {error}
        </p>
      )}
      
      {help && !error && (
        <p className="desktop-form-help">
          {help}
        </p>
      )}
    </div>
  );
});

DesktopInput.displayName = 'DesktopInput';

/**
 * 桌面端搜索框组件
 */
export function DesktopSearchInput({
  placeholder = '搜索...',
  value,
  onChange,
  onSearch,
  className = ''
}: {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch?: (query: string) => void;
  className?: string;
}) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch && value) {
      onSearch(value);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <DesktopInput
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyPress={handleKeyPress}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        iconPosition="left"
      />
      {onSearch && value && (
        <button
          onClick={() => onSearch(value)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-600 hover:text-orange-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
          </svg>
        </button>
      )}
    </div>
  );
}