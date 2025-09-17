/**
 * 内容验证Hook
 */

import { useState, useCallback, useMemo } from 'react';
import { validateContent, cleanUserContent, createValidationSummary } from '@/lib/security';
import { ValidationResult, ContentFilterOptions } from '@/lib/security/types';

export interface UseContentValidationOptions extends ContentFilterOptions {
  /** 是否实时验证 */
  realTimeValidation?: boolean;
  /** 防抖延迟（毫秒） */
  debounceDelay?: number;
  /** 是否自动清理内容 */
  autoClean?: boolean;
}

export interface ContentValidationState {
  /** 原始内容 */
  content: string;
  /** 清理后的内容 */
  cleanContent: string;
  /** 验证结果 */
  validation: ValidationResult | null;
  /** 是否正在验证 */
  isValidating: boolean;
  /** 是否有错误 */
  hasErrors: boolean;
  /** 是否有警告 */
  hasWarnings: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings: string[];
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high';
}

export function useContentValidation(options: UseContentValidationOptions = {}) {
  const {
    realTimeValidation = true,
    debounceDelay = 300,
    autoClean = false,
    ...validationOptions
  } = options;

  const [state, setState] = useState<ContentValidationState>({
    content: '',
    cleanContent: '',
    validation: null,
    isValidating: false,
    hasErrors: false,
    hasWarnings: false,
    errors: [],
    warnings: [],
    riskLevel: 'low'
  });

  // 防抖定时器
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  /**
   * 执行验证
   */
  const performValidation = useCallback((content: string) => {
    if (!content.trim()) {
      setState(prev => ({
        ...prev,
        validation: null,
        isValidating: false,
        hasErrors: false,
        hasWarnings: false,
        errors: [],
        warnings: [],
        riskLevel: 'low',
        cleanContent: ''
      }));
      return;
    }

    setState(prev => ({ ...prev, isValidating: true }));

    try {
      const validation = validateContent(content, validationOptions);
      const summary = createValidationSummary(validation);
      
      setState(prev => ({
        ...prev,
        validation,
        isValidating: false,
        hasErrors: summary.hasErrors,
        hasWarnings: summary.hasWarnings,
        errors: summary.errors,
        warnings: summary.warnings,
        riskLevel: validation.riskLevel,
        cleanContent: autoClean ? validation.cleanContent : content
      }));
    } catch (error) {
      console.error('Content validation error:', error);
      setState(prev => ({
        ...prev,
        isValidating: false,
        hasErrors: true,
        errors: ['验证过程中发生错误'],
        warnings: [],
        riskLevel: 'high'
      }));
    }
  }, [validationOptions, autoClean]);

  /**
   * 更新内容
   */
  const updateContent = useCallback((newContent: string) => {
    setState(prev => ({ ...prev, content: newContent }));

    if (realTimeValidation) {
      // 清除之前的定时器
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // 设置新的防抖定时器
      const timer = setTimeout(() => {
        performValidation(newContent);
      }, debounceDelay);

      setDebounceTimer(timer);
    }
  }, [realTimeValidation, debounceDelay, debounceTimer, performValidation]);

  /**
   * 手动验证
   */
  const validate = useCallback(() => {
    performValidation(state.content);
  }, [state.content, performValidation]);

  /**
   * 清理内容
   */
  const cleanContent = useCallback(() => {
    const cleaned = cleanUserContent(state.content);
    setState(prev => ({
      ...prev,
      content: cleaned,
      cleanContent: cleaned
    }));
    
    if (realTimeValidation) {
      performValidation(cleaned);
    }
  }, [state.content, realTimeValidation, performValidation]);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    setState({
      content: '',
      cleanContent: '',
      validation: null,
      isValidating: false,
      hasErrors: false,
      hasWarnings: false,
      errors: [],
      warnings: [],
      riskLevel: 'low'
    });
  }, [debounceTimer]);

  /**
   * 获取第一个错误信息
   */
  const firstError = useMemo(() => {
    return state.errors.length > 0 ? state.errors[0] : null;
  }, [state.errors]);

  /**
   * 获取第一个警告信息
   */
  const firstWarning = useMemo(() => {
    return state.warnings.length > 0 ? state.warnings[0] : null;
  }, [state.warnings]);

  /**
   * 是否可以提交
   */
  const canSubmit = useMemo(() => {
    return state.content.trim().length > 0 && !state.hasErrors && !state.isValidating;
  }, [state.content, state.hasErrors, state.isValidating]);

  // 清理定时器
  useState(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  });

  return {
    // 状态
    ...state,
    
    // 计算属性
    firstError,
    firstWarning,
    canSubmit,
    
    // 方法
    updateContent,
    validate,
    cleanContent,
    reset
  };
}