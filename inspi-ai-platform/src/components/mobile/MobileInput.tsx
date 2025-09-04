'use client';

import React, { forwardRef } from 'react';

interface MobileInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'textarea';
  disabled?: boolean;
  error?: string;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}

/**
 * 移动端输入框组件
 */
export const MobileInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, MobileInputProps>(({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  error,
  required = false,
  maxLength,
  rows = 4,
  className = '',
  leftIcon,
  rightIcon,
  onRightIconClick
}, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className={`mobile-input-group ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        
        {type === 'textarea' ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            maxLength={maxLength}
            rows={rows}
            className={`
              mobile-input-enhanced
              mobile-focus-visible
              resize-none
              ${error ? 'border-red-500 focus:border-red-500' : ''}
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
            `.trim()}
          />
        ) : type === 'search' ? (
          <div className="mobile-search-input">
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              type="text"
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              maxLength={maxLength}
              className={`
                mobile-input-enhanced
                mobile-focus-visible
                ${rightIcon ? 'pr-10' : ''}
                ${error ? 'border-red-500 focus:border-red-500' : ''}
                ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
              `.trim()}
            />
          </div>
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            type={type}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            maxLength={maxLength}
            className={`
              mobile-input-enhanced
              mobile-focus-visible
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error ? 'border-red-500 focus:border-red-500' : ''}
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
            `.trim()}
          />
        )}
        
        {rightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 mobile-touch-feedback"
          >
            {rightIcon}
          </button>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});