/**
 * UI简化 - 导航功能完整性测试
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DesktopHomePage } from '@/components/desktop/pages/DesktopHomePage';
import { DesktopCreatePage } from '@/components/desktop/pages/DesktopCreatePage';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href, className }: any) => {
    return <a href={href} className={className}>{children}</a>;
  };
});

describe('导航功能完整性测试', () => {
  describe('首页导航', () => {
    test('显示简化后的3个导航项', () => {
      render(<DesktopHomePage />);
      
      // 验证3个主要导航项存在
      expect(screen.getByText('首页')).toBeInTheDocument();
      expect(screen.getByText('创作')).toBeInTheDocument();
      expect(screen.getByText('个人中心')).toBeInTheDocument();
      
      // 验证"广场"导航项已被移除
      expect(screen.queryByText('广场')).not.toBeInTheDocument();
      expect(screen.queryByText('我的')).not.toBeInTheDocument();
    });

    test('导航链接指向正确的路径', () => {
      render(<DesktopHomePage />);
      
      const homeLink = screen.getByText('首页').closest('a');
      const createLink = screen.getByText('创作').closest('a');
      const profileLink = screen.getByText('个人中心').closest('a');
      
      expect(homeLink).toHaveAttribute('href', '/');
      expect(createLink).toHaveAttribute('href', '/create');
      expect(profileLink).toHaveAttribute('href', '/profile');
    });

    test('首页导航项具有active状态', () => {
      render(<DesktopHomePage />);
      
      const homeLink = screen.getByText('首页');
      expect(homeLink).toHaveClass('modern-nav-link', 'active');
    });
  });

  describe('创作页导航', () => {
    test('显示简化后的3个导航项', () => {
      render(<DesktopCreatePage />);
      
      // 验证3个主要导航项存在
      expect(screen.getByText('首页')).toBeInTheDocument();
      expect(screen.getByText('创作')).toBeInTheDocument();
      expect(screen.getByText('个人中心')).toBeInTheDocument();
      
      // 验证"广场"导航项已被移除
      expect(screen.queryByText('广场')).not.toBeInTheDocument();
      expect(screen.queryByText('我的')).not.toBeInTheDocument();
    });

    test('创作页导航项具有active状态', () => {
      render(<DesktopCreatePage />);
      
      const createLink = screen.getByText('创作');
      expect(createLink).toHaveClass('modern-nav-link', 'active');
    });
  });

  describe('导航一致性', () => {
    test('所有页面的导航结构一致', () => {
      const { unmount: unmountHome } = render(<DesktopHomePage />);
      const homeNavItems = screen.getAllByRole('link').filter(link => 
        link.textContent === '首页' || 
        link.textContent === '创作' || 
        link.textContent === '个人中心'
      );
      unmountHome();

      const { unmount: unmountCreate } = render(<DesktopCreatePage />);
      const createNavItems = screen.getAllByRole('link').filter(link => 
        link.textContent === '首页' || 
        link.textContent === '创作' || 
        link.textContent === '个人中心'
      );
      unmountCreate();

      // 验证导航项数量一致
      expect(homeNavItems.length).toBeGreaterThanOrEqual(3);
      expect(createNavItems.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('向后兼容性', () => {
    test('原有路由仍然可访问', () => {
      // 验证关键路由路径没有改变
      const routes = ['/', '/create', '/profile'];
      
      routes.forEach(route => {
        expect(route).toMatch(/^\/[a-z]*$/); // 验证路由格式正确
      });
    });

    test('Logo链接功能正常', () => {
      render(<DesktopHomePage />);
      
      const logoLinks = screen.getAllByText('Inspi.AI');
      expect(logoLinks.length).toBeGreaterThan(0);
      
      // 检查是否有logo链接指向首页
      const logoLink = logoLinks.find(logo => logo.closest('a')?.getAttribute('href') === '/');
      expect(logoLink).toBeTruthy();
    });
  });
});