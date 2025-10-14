'use client';

import React, { forwardRef } from 'react';

export interface SafeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValidatedChange?: (value: string, isValid: boolean) => void;
}

const SafeTextarea = forwardRef<HTMLTextAreaElement, SafeTextareaProps>(
  ({ className = '', onValidatedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;

      // 简单的验证逻辑
      const isValid = value.length <= 1000; // 简单的长度限制

      if (onValidatedChange) {
        onValidatedChange(value, isValid);
      }

      if (onChange) {
        onChange(e);
      }
    };

    return (
      <textarea
        ref={ref}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
        onChange={handleChange}
        {...props}
      />
    );
  },
);

SafeTextarea.displayName = 'SafeTextarea';

export default SafeTextarea;
