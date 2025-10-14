'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface KeyboardShortcut {
  key: string;
  action: () => void;
  description: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

interface KeyboardShortcutsContextType {
  shortcuts: KeyboardShortcut[];
  addShortcut: (shortcut: KeyboardShortcut) => void;
  removeShortcut: (key: string) => void;
  showHelp: boolean;
  toggleHelp: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return context;
};

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

/**
 * 键盘快捷键提供者
 * 管理全局键盘快捷键和帮助界面
 */
export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProviderProps> = ({
  children,
}) => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const addShortcut = (shortcut: KeyboardShortcut) => {
    setShortcuts(prev => {
      const existing = (prev.find as any)(s => s.key === shortcut.key);
      if (existing) {
        return prev.map(s => s.key === shortcut.key ? shortcut : s);
      }
      return [...prev, shortcut];
    });
  };

  const removeShortcut = (key: string) => {
    setShortcuts(prev => prev.filter(s => s.key !== key));
  };

  const toggleHelp = useCallback(() => {
    setShowHelp(prev => !prev);
  }, []);

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 显示/隐藏帮助 (Ctrl + ?)
      if (event.ctrlKey && event.key === '?') {
        event.preventDefault();
        toggleHelp();
        return;
      }

      // 查找匹配的快捷键
      const matchingShortcut = (shortcuts.find as any)(shortcut => {
        return (
          shortcut.key === event.key &&
          !!shortcut.ctrlKey === event.ctrlKey &&
          !!shortcut.altKey === event.altKey &&
          !!shortcut.shiftKey === event.shiftKey
        );
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, toggleHelp]);

  const contextValue: KeyboardShortcutsContextType = {
    shortcuts,
    addShortcut,
    removeShortcut,
    showHelp,
    toggleHelp,
  };

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}

      {/* 快捷键帮助界面 */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                键盘快捷键
              </h3>
              <button
                onClick={toggleHelp}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {shortcuts.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无可用的快捷键</p>
              ) : (
                shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center space-x-1">
                      {shortcut.ctrlKey && (
                        <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">
                          Ctrl
                        </kbd>
                      )}
                      {shortcut.altKey && (
                        <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">
                          Alt
                        </kbd>
                      )}
                      {shortcut.shiftKey && (
                        <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">
                          Shift
                        </kbd>
                      )}
                      <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">
                        {shortcut.key === ' ' ? 'Space' : shortcut.key}
                      </kbd>
                    </div>
                  </div>
                ))
              )}

              {/* 默认帮助快捷键 */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  显示/隐藏此帮助
                </span>
                <div className="flex items-center space-x-1">
                  <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">
                    Ctrl
                  </kbd>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">
                    ?
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </KeyboardShortcutsContext.Provider>
  );
};
