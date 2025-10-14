'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useCallback } from 'react';

import { useLoginPrompt } from '@/components/auth/LoginPrompt';

interface DesktopNavigationProps {
  className?: string;
  activeHref?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_LOGIN_PROMPT_MESSAGE = '登录后即可继续您的教学创作之旅';

/**
 * 桌面端导航组件
 * 优化了桌面端的导航体验
 */
export function DesktopNavigation({
  className = '',
  activeHref,
}: DesktopNavigationProps) {
  const pathname = usePathname();
  const current = activeHref ?? pathname;
  const { showPrompt, LoginPromptComponent } = useLoginPrompt();

  const handleLoginClick = useCallback(() => {
    showPrompt('create', NAV_LOGIN_PROMPT_MESSAGE);
  }, [showPrompt]);

  const navItems: NavItem[] = [
    {
      href: '/',
      label: '首页',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/create',
      label: '创作',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      href: '/square',
      label: '广场',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      href: '/profile',
      label: '个人中心',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className={`desktop-nav-enhanced ${className}`}>
      <div className="desktop-container">
        <div className="desktop-nav__inner">
          <Link href="/" className="desktop-nav-brand">
            <div className="desktop-nav-brand-logo">✨</div>
            <span className="desktop-nav-brand-text">Inspi.AI</span>
          </Link>

          <div className="desktop-nav__links" role="navigation" aria-label="主导航">
            {navItems.map((item) => {
              const isActive = current === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`desktop-nav__link ${isActive ? 'desktop-nav__link--active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="desktop-nav-right">
            <div className="desktop-nav__actions">
              <button
                type="button"
                className="modern-btn modern-btn-ghost modern-btn-sm"
                onClick={handleLoginClick}
              >
                登录
              </button>
            </div>
          </div>
        </div>
      </div>
      <LoginPromptComponent />
    </nav>
  );
}

/**
 * 桌面端面包屑导航
 */
export function DesktopBreadcrumb({
  items,
  className = '',
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
