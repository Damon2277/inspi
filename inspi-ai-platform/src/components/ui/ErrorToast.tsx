'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Toast类型
 */
export type ToastType = 'error' | 'warning' | 'success' | 'info';

/**
 * Toast项目接口
 */
export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

/**
 * Toast容器状态
 */
interface ToastState {
  toasts: ToastItem[];
}

/**
 * 全局Toast管理器
 */
class ToastManager {
  private listeners: Set<(toasts: ToastItem[]) => void> = new Set();
  private toasts: ToastItem[] = [];

  subscribe(listener: (toasts: ToastItem[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  show(toast: Omit<ToastItem, 'id'>) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastItem = {
      id,
      duration: 5000,
      ...toast
    };

    this.toasts.push(newToast);
    this.notify();

    // 自动移除
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, newToast.duration);
    }

    return id;
  }

  remove(id: string) {
    const index = this.toasts.findIndex(toast => toast.id === id);
    if (index > -1) {
      const toast = this.toasts[index];
      this.toasts.splice(index, 1);
      this.notify();
      
      if (toast.onClose) {
        toast.onClose();
      }
    }
  }

  clear() {
    this.toasts = [];
    this.notify();
  }

  // 便捷方法
  error(message: string, options?: Partial<Omit<ToastItem, 'id' | 'type' | 'message'>>) {
    return this.show({ type: 'error', message, ...options });
  }

  warning(message: string, options?: Partial<Omit<ToastItem, 'id' | 'type' | 'message'>>) {
    return this.show({ type: 'warning', message, ...options });
  }

  success(message: string, options?: Partial<Omit<ToastItem, 'id' | 'type' | 'message'>>) {
    return this.show({ type: 'success', message, ...options });
  }

  info(message: string, options?: Partial<Omit<ToastItem, 'id' | 'type' | 'message'>>) {
    return this.show({ type: 'info', message, ...options });
  }
}

// 全局Toast管理器实例
export const toast = new ToastManager();

/**
 * Toast图标组件
 */
const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  const iconClasses = "w-5 h-5";
  
  switch (type) {
    case 'error':
      return (
        <svg className={`${iconClasses} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'warning':
      return (
        <svg className={`${iconClasses} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    case 'success':
      return (
        <svg className={`${iconClasses} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'info':
      return (
        <svg className={`${iconClasses} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
};

/**
 * 单个Toast组件
 */
const Toast: React.FC<{ 
  toast: ToastItem; 
  onRemove: (id: string) => void;
}> = ({ toast: toastItem, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 进入动画
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(toastItem.id);
    }, 300);
  };

  const getToastStyles = () => {
    const baseStyles = "max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transition-all duration-300 transform";
    
    if (isLeaving) {
      return `${baseStyles} translate-x-full opacity-0`;
    }
    
    if (isVisible) {
      return `${baseStyles} translate-x-0 opacity-100`;
    }
    
    return `${baseStyles} translate-x-full opacity-0`;
  };

  const getBorderColor = () => {
    switch (toastItem.type) {
      case 'error': return 'border-l-red-500';
      case 'warning': return 'border-l-yellow-500';
      case 'success': return 'border-l-green-500';
      case 'info': return 'border-l-blue-500';
      default: return 'border-l-gray-500';
    }
  };

  return (
    <div className={`${getToastStyles()} border-l-4 ${getBorderColor()}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ToastIcon type={toastItem.type} />
          </div>
          <div className="ml-3 w-0 flex-1">
            {toastItem.title && (
              <p className="text-sm font-medium text-gray-900 mb-1">
                {toastItem.title}
              </p>
            )}
            <p className="text-sm text-gray-700">
              {toastItem.message}
            </p>
            {toastItem.action && (
              <div className="mt-3">
                <button
                  onClick={toastItem.action.onClick}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  {toastItem.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="sr-only">关闭</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Toast容器组件
 */
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = toast.subscribe(setToasts);
    return unsubscribe;
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50">
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
        {toasts.map((toastItem) => (
          <Toast
            key={toastItem.id}
            toast={toastItem}
            onRemove={toast.remove.bind(toast)}
          />
        ))}
      </div>
    </div>,
    document.body
  );
};

/**
 * Toast Hook
 */
export function useToast() {
  return {
    show: toast.show.bind(toast),
    error: toast.error.bind(toast),
    warning: toast.warning.bind(toast),
    success: toast.success.bind(toast),
    info: toast.info.bind(toast),
    remove: toast.remove.bind(toast),
    clear: toast.clear.bind(toast)
  };
}

/**
 * 错误Toast Hook
 */
export function useErrorToast() {
  const { error, warning } = useToast();

  const showError = (errorObj: Error | string, options?: {
    title?: string;
    duration?: number;
    action?: ToastItem['action'];
  }) => {
    const message = typeof errorObj === 'string' ? errorObj : errorObj.message;
    return error(message, {
      title: options?.title || '错误',
      duration: options?.duration,
      action: options?.action
    });
  };

  const showNetworkError = (retryFn?: () => void) => {
    return error('网络连接失败，请检查网络后重试', {
      title: '网络错误',
      duration: 8000,
      action: retryFn ? {
        label: '重试',
        onClick: retryFn
      } : undefined
    });
  };

  const showValidationError = (message: string) => {
    return warning(message, {
      title: '输入错误',
      duration: 6000
    });
  };

  return {
    showError,
    showNetworkError,
    showValidationError
  };
}

export default ToastContainer;