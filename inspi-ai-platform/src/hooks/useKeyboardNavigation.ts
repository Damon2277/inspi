'use client';

import { useEffect, useCallback, useRef } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

interface UseKeyboardNavigationOptions {
  shortcuts?: KeyboardShortcut[];
  disabled?: boolean;
  scope?: 'global' | 'local';
}

/**
 * 键盘导航和快捷键管理Hook
 */
export const useKeyboardNavigation = (options: UseKeyboardNavigationOptions = {}) => {
  const {
    shortcuts = [],
    disabled = false,
    scope = 'global'
  } = options;

  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;

    // 忽略在输入框中的按键
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      return (
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.altKey === event.altKey &&
        !!shortcut.shiftKey === event.shiftKey &&
        !!shortcut.metaKey === event.metaKey
      );
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
      }
      matchingShortcut.action();
    }
  }, [disabled]);

  useEffect(() => {
    if (scope === 'global') {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, scope]);

  return {
    shortcuts: shortcutsRef.current,
    disabled,
    scope
  };
};

/**
 * 焦点管理Hook
 * 管理组件内的焦点导航
 */
export function useFocusManagement(containerRef: React.RefObject<HTMLElement>) {
  const focusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    return Array.from(containerRef.current.querySelectorAll(selector)) as HTMLElement[];
  }, [containerRef]);

  const focusFirst = useCallback(() => {
    const elements = focusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }
  }, [focusableElements]);

  const focusLast = useCallback(() => {
    const elements = focusableElements();
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
    }
  }, [focusableElements]);

  const focusNext = useCallback(() => {
    const elements = focusableElements();
    const currentIndex = elements.indexOf(document.activeElement as HTMLElement);
    if (currentIndex < elements.length - 1) {
      elements[currentIndex + 1].focus();
    }
  }, [focusableElements]);

  const focusPrevious = useCallback(() => {
    const elements = focusableElements();
    const currentIndex = elements.indexOf(document.activeElement as HTMLElement);
    if (currentIndex > 0) {
      elements[currentIndex - 1].focus();
    }
  }, [focusableElements]);

  return {
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    focusableElements
  };
}