'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useResponsive } from '@/hooks/useResponsive';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

/**
 * 统一的响应式导航组件
 * 根据屏幕尺寸自动切换桌面端和移动端导航
 */
export function Navigation() {
  const pathname = usePathname();
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);

  // 防止hydration不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems: NavItem[] = [
    {
      href: '/',
      label: '首页',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      )
    },
    {
      href: '/create',
      label: 'AI魔法师',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 1a1 1 0 01.7 1.046l-1.6 14.4a1 1 0 01-.98.854H9.88a1 1 0 01-.98-.854L7.3 2.046A1 1 0 018 1a1 1 0 01.7 1.046l1.6 14.4 1.6-14.4A1 1 0 0112 1z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      href: '/square',
      label: '智慧广场',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 12a3 3 0 11-6 0 3 3 0 016 0zM21 12a3 3 0 11-6 0 3 3 0 016 0zM15 6a3 3 0 11-6 0 3 3 0 016 0zM15 18a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      href: '/works',
      label: '我的作品',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      )
    },
    {
      href: '/profile',
      label: '我的',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
        </svg>
      )
    }
  ];

  // 防止hydration不匹配，在客户端挂载前不渲染
  if (!mounted) {
    return null;
  }

  // 移动端导航 - 底部导航栏
  if (isMobile) {
    return (
      <nav className="mobile-bottom-navigation mobile-bottom-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-bottom-nav-item mobile-focus-visible ${
                isActive ? 'active' : ''
              }`}
            >
              <div className="mobile-bottom-nav-icon">
                {isActive && item.activeIcon ? item.activeIcon : item.icon}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // 桌面端导航 - 顶部导航栏
  return (
    <nav className="desktop-navigation">
      <div className="desktop-nav-container">
        {/* Logo */}
        <div className="desktop-nav-logo">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-indigo-600">Inspi.AI</span>
          </Link>
        </div>

        {/* 导航链接 */}
        <div className="desktop-nav-links">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`desktop-nav-link ${isActive ? 'active' : ''}`}
              >
                <div className="desktop-nav-icon">
                  {isActive && item.activeIcon ? item.activeIcon : item.icon}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* 用户菜单 */}
        <div className="desktop-nav-user">
          <button className="desktop-user-button">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}