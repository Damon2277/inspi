'use client';
import React, { createContext, useContext, useRef } from 'react';

import { useKeyboardNavigation, useFocusManagement } from '@/shared/hooks/useKeyboardNavigation';

interface KeyboardNavigationContextType {
  containerRef: React.RefObject<HTMLElement>;
  focusFirst: () => void;
  focusLast: () => void;
  focusNext: () => void;
  focusPrevious: () => void;
}

const KeyboardNavigationContext = createContext<KeyboardNavigationContextType | null>(null);

export function useKeyboardNavigationContext() {
  const context = useContext(KeyboardNavigationContext);
  if (!context) {
    throw new Error('useKeyboardNavigationContext must be used within KeyboardNavigationProvider');
  }
  return context;
}

interface KeyboardNavigationProviderProps {
  children: React.ReactNode;
}

export function KeyboardNavigationProvider({ children }: KeyboardNavigationProviderProps) {
  const containerRef = useRef<HTMLElement>(null!);
  const {
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
  } = useFocusManagement(containerRef as React.RefObject<HTMLElement>);

  // 设置全局键盘导航
  useKeyboardNavigation({
    shortcuts: [
      {
        key: 'ArrowUp',
        action: focusPrevious,
        description: '上一个焦点',
      },
      {
        key: 'ArrowDown',
        action: focusNext,
        description: '下一个焦点',
      },
    ],
    disabled: false,
  });

  const value = {
    containerRef,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
  };

  return (
    <KeyboardNavigationContext.Provider value={value}>
      <div ref={containerRef as React.RefObject<HTMLDivElement>}>
        {children}
      </div>
    </KeyboardNavigationContext.Provider>
  );
}
