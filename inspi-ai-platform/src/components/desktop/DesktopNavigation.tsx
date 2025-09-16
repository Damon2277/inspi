'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DesktopNavigationProps {
  className?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * 桌面端导航组件
 * 优化了桌面端的导航体验
 */
export function DesktopNavigation({ className = '' }: DesktopNavigationProps) {
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      href: '/',
      label: '首页',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
      )
    },
    {
      href: '/square',
      label: '智慧广场',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
      )
    }
  ];

  return (
    <nav className={`desktop-nav-enhanced ${className}`}>
      <div className="desktop-container">
        <div className="flex items-center justify-between h-16">
          {/* 品牌Logo */}
          <Link href="/" className="desktop-nav-brand">
            <div className="desktop-nav-brand-logo">
              ✨
            </div>
            <span className="desktop-nav-brand-text">
              Inspi.AI
            </span>
          </Link>

          {/* 导航菜单 */}
          <div className="desktop-nav-menu">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`desktop-nav-item ${pathname === item.href ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* 用户菜单 */}
          <div className="desktop-nav-user">
            <div className="desktop-dropdown">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="desktop-nav-avatar"
              >
                U
              </button>
              <div className={`desktop-dropdown-menu ${isUserMenuOpen ? 'show' : ''}`}>
                <Link href="/profile" className="desktop-dropdown-item">
                  个人资料
                </Link>
                <Link href="/settings" className="desktop-dropdown-item">
                  设置
                </Link>
                <hr className="my-1 border-gray-200" />
                <button className="desktop-dropdown-item w-full text-left">
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

/**
 * 桌面端面包屑导航
 */
export function DesktopBreadcrumb({
  items,
  className = ''
}: {
  items: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <nav className={`desktop-breadcrumb ${className}`}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="desktop-breadcrumb-separator">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          )}
          {item.href ? (
            <Link href={item.href} className="desktop-breadcrumb-item">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}