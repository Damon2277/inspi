/**
 * 移动端底部导航组件
 * 固定在底部的标签式导航
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { useResponsive } from '@/hooks/useResponsive';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  requireAuth?: boolean;
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: '创作',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
      </svg>
    ),
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
      </svg>
    ),
  },
  {
    href: '/square',
    label: '广场',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: '我的',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
    requireAuth: true,
  },
];

export default function MobileNavigation() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const { isMobile } = useResponsive();

  // 只在移动端显示
  if (!isMobile) {
    return null;
  }

  // 过滤需要认证的导航项
  const filteredNavItems = navItems.filter(item => {
    if (item.requireAuth && !isAuthenticated) {
      return false;
    }
    return true;
  });

  // 处理个人中心链接
  const getHref = (item: NavItem) => {
    if (item.href === '/profile' && isAuthenticated && user) {
      return `/profile/${user.id}`;
    }
    return item.href;
  };

  // 检查是否为当前页面
  const isActive = (item: NavItem) => {
    const href = getHref(item);
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="mobile-nav safe-area-bottom">
      {filteredNavItems.map((item) => {
        const href = getHref(item);
        const active = isActive(item);
        
        return (
          <Link
            key={item.href}
            href={href}
            className={`mobile-nav-item ${active ? 'active' : ''}`}
          >
            <div className="mb-1">
              {active ? item.activeIcon : item.icon}
            </div>
            <span className="text-xs font-medium">
              {item.label}
            </span>
          </Link>
        );
      })}
      
      {/* 未登录时显示登录按钮 */}
      {!isAuthenticated && (
        <Link
          href="/login"
          className="mobile-nav-item"
        >
          <div className="mb-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <span className="text-xs font-medium">登录</span>
        </Link>
      )}
    </nav>
  );
}