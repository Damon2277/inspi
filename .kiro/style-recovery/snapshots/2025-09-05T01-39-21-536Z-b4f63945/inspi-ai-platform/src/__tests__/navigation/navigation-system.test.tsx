import React from 'react';
import { render, screen } from '@testing-library/react';
import { Navigation } from '@/components/navigation/Navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { MockAuthProvider } from '@/lib/auth/MockAuthProvider';

// Mock useResponsive hook
jest.mock('@/hooks/useResponsive', () => ({
  useResponsive: () => ({ isMobile: false })
}));

// Mock usePathname
jest.mock('next/navigation', () => ({
  usePathname: () => '/'
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MockAuthProvider>
    {children}
  </MockAuthProvider>
);

describe('Navigation System', () => {
  test('Navigation component renders without errors', () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
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
      </TestWrapper>
    );
    
    // 验证布局和内容都渲染成功
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  test('Navigation links are present', () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );
    
    // 验证导航链接存在
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('AI魔法师')).toBeInTheDocument();
    expect(screen.getByText('智慧广场')).toBeInTheDocument();
    expect(screen.getByText('我的作品')).toBeInTheDocument();
    expect(screen.getByText('我的')).toBeInTheDocument();
  });
});