'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { KeyboardShortcutsProvider } from '@/components/ui/KeyboardShortcuts';

interface KeyboardNavigationContextType {
  isKeyboardUser: boolean;
  setKeyboardUser: (isKeyboard: boolean) => void;
}

const KeyboardNavigationContext = createContext<KeyboardNavigationContextType | undefined>(undefined);

export const useKeyboardNavigationContext = () => {
  const context = useContext(KeyboardNavigationContext);
  if (!context) {
    throw new Error('useKeyboardNavigationContext must be used within KeyboardNavigationProvider');
  }
  return context;
};

interface KeyboardNavigationProviderProps {
  children: React.ReactNode;
}

/**
 * 全局键盘导航提供者
 * 管理键盘导航状态和全局快捷键
 */
export const KeyboardNavigationProvider: React.FC<KeyboardNavigationProviderProps> = ({
  children
}) => {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  // 全局键盘快捷键
  useKeyboardNavigation({
    shortcuts: [
      {
        key: '/',
        action: () => {
          // 聚焦搜索框
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="搜索"], input[placeholder*="search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        },
        description: '聚焦搜索框'
      },
      {
        key: 'Escape',
        action: () => {
          // 关闭模态框或清除焦点
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && activeElement.blur) {
            activeElement.blur();
          }
          
          // 触发全局 ESC 事件
          document.dispatchEvent(new CustomEvent('global-escape'));
        },
        description: '关闭模态框或清除焦点'
      },
      {
        key: 'h',
        action: () => {
          // 返回首页
          window.location.href = '/';
        },
        description: '返回首页'
      }
    ]
  });

  // 检测键盘使用
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setIsKeyboardUser(true);
        document.body.classList.add('keyboard-navigation-active');
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
      document.body.classList.remove('keyboard-navigation-active');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // 添加跳过链接
  useEffect(() => {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = '跳到主要内容';
    skipLink.setAttribute('aria-label', '跳到主要内容');
    
    document.body.insertBefore(skipLink, document.body.firstChild);

    return () => {
      if (skipLink.parentNode) {
        skipLink.parentNode.removeChild(skipLink);
      }
    };
  }, []);

  const contextValue: KeyboardNavigationContextType = {
    isKeyboardUser,
    setKeyboardUser: setIsKeyboardUser
  };

  return (
    <KeyboardNavigationContext.Provider value={contextValue}>
      <KeyboardShortcutsProvider>
        {children}
      </KeyboardShortcutsProvider>
    </KeyboardNavigationContext.Provider>
  );
};