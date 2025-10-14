import { render, screen } from '@testing-library/react';
import React from 'react';

import { DesktopNavigation } from '@/components/desktop/DesktopNavigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { MockAuthProvider } from '@/core/auth/MockAuthProvider';

// Mock usePathname
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MockAuthProvider>
    {children}
  </MockAuthProvider>
);

describe('Desktop Navigation System', () => {
  test('DesktopNavigation renders without errors', () => {
    render(
      <TestWrapper>
        <DesktopNavigation activeHref="/" />
      </TestWrapper>,
    );

    // 验证导航组件渲染成功
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  test('AppLayout renders with navigation', () => {
    render(
      <TestWrapper>
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      </TestWrapper>,
    );

    // 验证布局和内容都渲染成功
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  test('DesktopNavigation links and actions are present', () => {
    render(
      <TestWrapper>
        <DesktopNavigation activeHref="/" />
      </TestWrapper>,
    );

    // 验证导航链接存在
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('创作')).toBeInTheDocument();
    expect(screen.getByText('广场')).toBeInTheDocument();
    expect(screen.getByText('个人中心')).toBeInTheDocument();
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByText('开始创作')).toBeInTheDocument();
  });
});
