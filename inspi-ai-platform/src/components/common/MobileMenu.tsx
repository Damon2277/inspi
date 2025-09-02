/**
 * 移动端菜单组件
 * 全屏滑出式菜单，优化触摸体验
 */

'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function MobileMenu({
  isOpen,
  onClose,
  isAuthenticated,
  user,
  onLogin,
  onLogout
}: MobileMenuProps) {
  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const menuItems = [
    { href: '/', label: 'AI教学魔法师', icon: '🪄' },
    { href: '/square', label: '智慧广场', icon: '🏛️' },
    ...(isAuthenticated ? [
      { href: `/profile/${user?.id}`, label: '个人中心', icon: '👤' },
      { href: '/subscription', label: '订阅管理', icon: '💎' },
    ] : []),
  ];

  const handleItemClick = () => {
    onClose();
  };

  const handleLogout = async () => {
    await onLogout();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />

          {/* 菜单内容 */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl z-50 safe-area-inset"
          >
            <div className="flex flex-col h-full">
              {/* 头部 */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">I</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Inspi.AI</h2>
                    {isAuthenticated && user && (
                      <p className="text-sm text-gray-500">{user.name}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="touch-target p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="关闭菜单"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 菜单项 */}
              <nav className="flex-1 py-6">
                <ul className="space-y-2">
                  {menuItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={handleItemClick}
                        className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors mobile-button"
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-base font-medium">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* 底部操作 */}
              <div className="border-t border-gray-200 p-6 space-y-4">
                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors mobile-button"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>退出登录</span>
                  </button>
                ) : (
                  <button
                    onClick={onLogin}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mobile-button"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>登录</span>
                  </button>
                )}

                {/* 版本信息 */}
                <div className="text-center">
                  <p className="text-xs text-gray-400">
                    Inspi.AI v1.0.0
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    让教学创意飞起来 ✨
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}