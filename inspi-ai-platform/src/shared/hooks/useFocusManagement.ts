'use client';

import { useRef, useCallback, useEffect } from 'react';

interface FocusableElement extends HTMLElement {
  focus(): void;
}

/**
 * 焦点管理Hook
 * 提供焦点陷阱、焦点循环等功能
 */
export const useFocusManagement = () => {
  const containerRef = useRef<HTMLElement>(null);

  // 获取所有可聚焦元素
  const getFocusableElements = useCallback((container?: HTMLElement): FocusableElement[] => {
    const element = container || containerRef.current;
    if (!element) return [];

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(element.querySelectorAll(focusableSelectors)) as FocusableElement[];
  }, []);

  // 聚焦第一个元素
  const focusFirst = useCallback((container?: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [getFocusableElements]);

  // 聚焦最后一个元素
  const focusLast = useCallback((container?: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }, [getFocusableElements]);

  // 聚焦下一个元素
  const focusNext = useCallback((container?: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);

    if (currentIndex === -1) {
      focusFirst(container);
    } else if (currentIndex === focusableElements.length - 1) {
      focusableElements[0].focus(); // 循环到第一个
    } else {
      focusableElements[currentIndex + 1].focus();
    }
  }, [getFocusableElements, focusFirst]);

  // 聚焦上一个元素
  const focusPrevious = useCallback((container?: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);

    if (currentIndex === -1) {
      focusLast(container);
    } else if (currentIndex === 0) {
      focusableElements[focusableElements.length - 1].focus(); // 循环到最后一个
    } else {
      focusableElements[currentIndex - 1].focus();
    }
  }, [getFocusableElements, focusLast]);

  return {
    containerRef,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    getFocusableElements,
  };
};
