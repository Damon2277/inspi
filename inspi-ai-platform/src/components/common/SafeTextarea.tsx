/**
 * 安全文本输入组件 - 集成内容验证功能
 */

'use client';

import React, { forwardRef, useImperativeHandle } from 'react';
import { useContentValidation, UseContentValidationOptions } from '@/hooks/useContentValidation';
import { cn } from '@/lib/utils';

export interface SafeTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  /** 输入值 */
  value?: string;
  /** 值变化回调 */
  onChange?: (value: string, isValid: boolean) => void;
  /** 验证选项 */
  validationOptions?: UseContentValidationOptions;
  /** 是否显示字数统计 */
  showCharCount?: boolean;
  /** 是否显示验证状态 */
  showValidationStatus?: boolean;
  /** 是否显示清理按钮 */
  showCleanButton?: boolean;
  /** 错误样式类名 */
  errorClassName?: string;
  /** 警告样式类名 */
  warningClassName?: string;
  /** 成功样式类名 */
  successClassName?: string;
}

export interface SafeTextareaRef {
  validate: () => void;
  clean: () => void;
  reset: () => void;
  focus: () => void;
  blur: () => void;
}

const SafeTextarea = forwardRef<SafeTextareaRef, SafeTextareaProps>(({
  value = '',
  onChange,
  validationOptions = {},
  showCharCount = true,
  showValidationStatus = true,
  showCleanButton = false,
  errorClassName = 'border-red-500 focus:border-red-500',
  warningClassName = 'border-yellow-500 focus:border-yellow-500',
  successClassName = 'border-green-500 focus:border-green-500',
  className,
  placeholder = '请输入内容...',
  maxLength = 500,
  ...props
}, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  const {
    content,
    cleanContent,
    hasErrors,
    hasWarnings,
    errors,
    warnings,
    riskLevel,
    isValidating,
    canSubmit,
    firstError,
    firstWarning,
    updateContent,
    validate,
    cleanContent: performClean,
    reset
  } = useContentValidation({
    maxLength,
    realTimeValidation: true,
    debounceDelay: 300,
    ...validationOptions
  });

  // 同步外部value
  React.useEffect(() => {
    if (value !== content) {
      updateContent(value);
    }
  }, [value, content, updateContent]);

  // 通知外部值变化
  React.useEffect(() => {
    if (onChange && content !== value) {
      onChange(content, canSubmit);
    }
  }, [content, canSubmit, onChange, value]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    validate,
    clean: performClean,
    reset,
    focus: () => textareaRef.current?.focus(),
    blur: () => textareaRef.current?.blur()
  }));

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateContent(e.target.value);
  };

  // 获取边框样式
  const getBorderStyle = () => {
    if (hasErrors) return errorClassName;
    if (hasWarnings) return warningClassName;
    if (content && !hasErrors && !hasWarnings) return successClassName;
    return '';
  };

  // 获取风险等级颜色
  const getRiskLevelColor = () => {
    switch (riskLevel) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="w-full">
      {/* 主输入区域 */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLength}
          className={cn(
            'w-full px-3 py-2 border border-gray-300 rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'resize-none transition-colors duration-200',
            getBorderStyle(),
            className
          )}
          {...props}
        />
        
        {/* 验证状态指示器 */}
        {showValidationStatus && (
          <div className="absolute top-2 right-2 flex items-center space-x-1">
            {isValidating && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
            {!isValidating && hasErrors && (
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
            )}
            {!isValidating && hasWarnings && !hasErrors && (
              <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">?</span>
              </div>
            )}
            {!isValidating && canSubmit && (
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部信息栏 */}
      <div className="mt-2 flex items-center justify-between text-sm">
        {/* 左侧：错误/警告信息 */}
        <div className="flex-1">
          {firstError && (
            <p className="text-red-600 flex items-center">
              <span className="mr-1">⚠</span>
              {firstError}
            </p>
          )}
          {!firstError && firstWarning && (
            <p className="text-yellow-600 flex items-center">
              <span className="mr-1">⚠</span>
              {firstWarning}
            </p>
          )}
          {!firstError && !firstWarning && content && (
            <p className={cn('flex items-center', getRiskLevelColor())}>
              <span className="mr-1">🛡</span>
              内容安全等级: {riskLevel === 'low' ? '低风险' : riskLevel === 'medium' ? '中风险' : '高风险'}
            </p>
          )}
        </div>

        {/* 右侧：字数统计和操作按钮 */}
        <div className="flex items-center space-x-3">
          {showCleanButton && content && (hasErrors || hasWarnings) && (
            <button
              type="button"
              onClick={performClean}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              清理内容
            </button>
          )}
          
          {showCharCount && (
            <span className={cn(
              'text-gray-500',
              content.length > maxLength * 0.9 && 'text-yellow-600',
              content.length >= maxLength && 'text-red-600'
            )}>
              {content.length}/{maxLength}
            </span>
          )}
        </div>
      </div>

      {/* 详细错误信息（可展开） */}
      {(errors.length > 1 || warnings.length > 1) && (
        <details className="mt-2">
          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
            查看详细信息 ({errors.length + warnings.length} 个问题)
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
            {errors.map((error, index) => (
              <p key={`error-${index}`} className="text-red-600 mb-1">
                • {error}
              </p>
            ))}
            {warnings.map((warning, index) => (
              <p key={`warning-${index}`} className="text-yellow-600 mb-1">
                • {warning}
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
});

SafeTextarea.displayName = 'SafeTextarea';

export default SafeTextarea;