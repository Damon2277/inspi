/**
 * 响应式系统集成测试
 */

import { render, screen } from '@testing-library/react';

import { ResponsiveGrid, ResponsiveContainer, ResponsiveFlex } from '@/shared/components/ResponsiveGrid';

// Mock useResponsive hook
jest.mock('@/shared/hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isWide: false,
    currentBreakpoint: 'desktop',
    screenWidth: 1024,
    screenHeight: 768,
  }),
}));

describe('响应式组件集成测试', () => {
  test('ResponsiveContainer 应该正常渲染', () => {
    render(
      <ResponsiveContainer>
        <div data-testid="content">测试内容</div>
      </ResponsiveContainer>,
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  test('ResponsiveGrid 应该正常渲染', () => {
    render(
      <ResponsiveGrid>
        <div data-testid="grid-item-1">项目1</div>
        <div data-testid="grid-item-2">项目2</div>
      </ResponsiveGrid>,
    );

    expect(screen.getByTestId('grid-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('grid-item-2')).toBeInTheDocument();
  });

  test('ResponsiveFlex 应该正常渲染', () => {
    render(
      <ResponsiveFlex>
        <div data-testid="flex-item-1">项目1</div>
        <div data-testid="flex-item-2">项目2</div>
      </ResponsiveFlex>,
    );

    expect(screen.getByTestId('flex-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('flex-item-2')).toBeInTheDocument();
  });
});
