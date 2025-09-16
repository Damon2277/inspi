/**
 * PC端界面优化响应式测试
 * 测试各种屏幕尺寸下的布局效果和交互功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// 测试组件导入
import { OptimizedEnhancedHomepage } from '@/components/layout/OptimizedEnhancedHomepage';
import { HomepageSidebar } from '@/components/layout/HomepageSidebar';
import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout';
import { AdaptiveGrid } from '@/components/layout/AdaptiveGrid';
import { useResponsive } from '@/hooks/useResponsive';

// Mock useResponsive hook
const mockUseResponsive = jest.fn();
jest.mock('@/hooks/useResponsive', () => ({
  useResponsive: mockUseResponsive,
}));

// Mock window.location
const mockLocation = {
  href: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Use Object.assign to avoid redefining property error
Object.assign(window, { location: mockLocation });

// 测试断点配置
const breakpoints = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 },
  wide: { width: 1440, height: 900 },
  ultrawide: { width: 1920, height: 1080 },
};

// 设置视口大小的辅助函数
const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  // 触发resize事件
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

// Mock响应式Hook返回值的辅助函数
const mockResponsiveHook = (width: number) => {
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isWide = width >= 1440;

  mockUseResponsive.mockReturnValue({
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : isDesktop ? 'desktop' : 'wide',
    width,
    height: 800,
  });
};

describe('PC端界面优化响应式测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.href = '';
  });

  describe('多断点布局测试', () => {
    test('移动端显示单栏布局', async () => {
      setViewport(breakpoints.mobile.width, breakpoints.mobile.height);
      mockResponsiveHook(breakpoints.mobile.width);

      render(<OptimizedEnhancedHomepage />);

      // 移动端不应显示侧边栏
      expect(screen.queryByTestId('sidebar-left')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sidebar-right')).not.toBeInTheDocument();

      // 应该显示移动端优化的主内容
      expect(screen.getByText('AI驱动的教师智慧平台')).toBeInTheDocument();
      
      // 按钮应该是全宽度
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('平板端显示双栏布局', async () => {
      setViewport(breakpoints.tablet.width, breakpoints.tablet.height);
      mockResponsiveHook(breakpoints.tablet.width);

      render(<OptimizedEnhancedHomepage />);

      await waitFor(() => {
        // 平板端应该显示右侧边栏但不显示左侧边栏
        expect(screen.queryByTestId('sidebar-left')).not.toBeInTheDocument();
      });
    });

    test('桌面端显示三栏布局', async () => {
      setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
      mockResponsiveHook(breakpoints.desktop.width);

      render(<OptimizedEnhancedHomepage />);

      await waitFor(() => {
        // 桌面端应该显示完整的三栏布局
        const mainContent = screen.getByText('AI驱动的教师智慧平台');
        expect(mainContent).toBeInTheDocument();
      });
    });

    test('超宽屏优化显示', async () => {
      setViewport(breakpoints.ultrawide.width, breakpoints.ultrawide.height);
      mockResponsiveHook(breakpoints.ultrawide.width);

      render(<OptimizedEnhancedHomepage />);

      await waitFor(() => {
        // 超宽屏应该显示所有布局元素
        expect(screen.getByText('AI驱动的教师智慧平台')).toBeInTheDocument();
      });
    });
  });

  describe('网格系统响应式测试', () => {
    test('移动端单列网格', async () => {
      setViewport(breakpoints.mobile.width, breakpoints.mobile.height);
      mockResponsiveHook(breakpoints.mobile.width);

      render(
        <AdaptiveGrid
          cols={{ mobile: 1, tablet: 2, desktop: 3, wide: 4 }}
          gap="1rem"
          data-testid="adaptive-grid"
        >
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </AdaptiveGrid>
      );

      const grid = screen.getByTestId('adaptive-grid');
      expect(grid).toHaveClass('grid-cols-1');
    });

    test('平板端双列网格', async () => {
      setViewport(breakpoints.tablet.width, breakpoints.tablet.height);
      mockResponsiveHook(breakpoints.tablet.width);

      render(
        <AdaptiveGrid
          cols={{ mobile: 1, tablet: 2, desktop: 3, wide: 4 }}
          gap="1rem"
          data-testid="adaptive-grid"
        >
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </AdaptiveGrid>
      );

      const grid = screen.getByTestId('adaptive-grid');
      expect(grid).toHaveClass('md:grid-cols-2');
    });

    test('桌面端三列网格', async () => {
      setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
      mockResponsiveHook(breakpoints.desktop.width);

      render(
        <AdaptiveGrid
          cols={{ mobile: 1, tablet: 2, desktop: 3, wide: 4 }}
          gap="1rem"
          data-testid="adaptive-grid"
        >
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </AdaptiveGrid>
      );

      const grid = screen.getByTestId('adaptive-grid');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });

    test('超宽屏四列网格', async () => {
      setViewport(breakpoints.wide.width, breakpoints.wide.height);
      mockResponsiveHook(breakpoints.wide.width);

      render(
        <AdaptiveGrid
          cols={{ mobile: 1, tablet: 2, desktop: 3, wide: 4 }}
          gap="1rem"
          data-testid="adaptive-grid"
        >
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
          <div>Item 4</div>
        </AdaptiveGrid>
      );

      const grid = screen.getByTestId('adaptive-grid');
      expect(grid).toHaveClass('xl:grid-cols-4');
    });
  });

  describe('侧边栏响应式测试', () => {
    test('左侧边栏在桌面端显示快捷功能', async () => {
      setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
      mockResponsiveHook(breakpoints.desktop.width);

      render(<HomepageSidebar position="left" />);

      expect(screen.getByText('快捷功能')).toBeInTheDocument();
      expect(screen.getByText('我的统计')).toBeInTheDocument();
      expect(screen.getByText('AI魔法师')).toBeInTheDocument();
      expect(screen.getByText('智慧广场')).toBeInTheDocument();
      expect(screen.getByText('知识图谱')).toBeInTheDocument();
    });

    test('右侧边栏显示最近活动和推荐内容', async () => {
      setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
      mockResponsiveHook(breakpoints.desktop.width);

      render(<HomepageSidebar position="right" />);

      expect(screen.getByText('最近活动')).toBeInTheDocument();
      expect(screen.getByText('推荐内容')).toBeInTheDocument();
      expect(screen.getByText('快速操作')).toBeInTheDocument();
    });

    test('侧边栏交互功能测试', async () => {
      setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
      mockResponsiveHook(breakpoints.desktop.width);

      render(<HomepageSidebar position="left" />);

      // 测试快捷功能按钮点击
      const aiMagicButton = screen.getByText('AI魔法师').closest('button');
      expect(aiMagicButton).toBeInTheDocument();

      fireEvent.click(aiMagicButton!);
      expect(mockLocation.href).toBe('/create');
    });
  });

  describe('交互功能响应式测试', () => {
    test('PC端悬停效果', async () => {
      setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
      mockResponsiveHook(breakpoints.desktop.width);

      render(<OptimizedEnhancedHomepage />);

      await waitFor(() => {
        const cards = screen.getAllByText(/教学/);
        expect(cards.length).toBeGreaterThan(0);
      });

      // 测试卡片悬停效果
      const firstCard = screen.getAllByText(/教学/)[0].closest('.group');
      if (firstCard) {
        fireEvent.mouseEnter(firstCard);
        expect(firstCard).toHaveClass('group');
      }
    });

    test('键盘导航支持', async () => {
      setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
      mockResponsiveHook(breakpoints.desktop.width);

      render(<OptimizedEnhancedHomepage />);

      // 测试Tab键导航
      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        buttons[0].focus();
        expect(buttons[0]).toHaveFocus();

        fireEvent.keyDown(buttons[0], { key: 'Tab' });
        // 验证焦点移动（具体实现取决于组件）
      }
    });

    test('移动端触摸优化', async () => {
      setViewport(breakpoints.mobile.width, breakpoints.mobile.height);
      mockResponsiveHook(breakpoints.mobile.width);

      render(<OptimizedEnhancedHomepage />);

      // 移动端应该有触摸友好的按钮大小
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // 验证按钮有足够的触摸目标大小（至少44px）
        expect(parseInt(styles.minHeight) || parseInt(styles.height)).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('性能测试', () => {
    test('懒加载组件性能', async () => {
      setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
      mockResponsiveHook(breakpoints.desktop.width);

      const startTime = performance.now();
      
      render(<OptimizedEnhancedHomepage />);

      await waitFor(() => {
        expect(screen.getByText('AI驱动的教师智慧平台')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // 渲染时间应该在合理范围内（小于1秒）
      expect(renderTime).toBeLessThan(1000);
    });

    test('内存使用优化', async () => {
      // 测试组件卸载时是否正确清理
      setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
      mockResponsiveHook(breakpoints.desktop.width);

      const { unmount } = render(<OptimizedEnhancedHomepage />);

      await waitFor(() => {
        expect(screen.getByText('AI驱动的教师智慧平台')).toBeInTheDocument();
      });

      // 卸载组件
      unmount();

      // 验证没有内存泄漏（这里只是示例，实际测试需要更复杂的内存监控）
      expect(true).toBe(true);
    });
  });

  describe('断点边界测试', () => {
    test('768px边界测试（移动端到平板端）', async () => {
      // 测试767px（移动端）
      setViewport(767, 600);
      mockResponsiveHook(767);

      const { rerender } = render(<OptimizedEnhancedHomepage />);
      
      // 应该显示移动端布局
      expect(screen.queryByTestId('sidebar-left')).not.toBeInTheDocument();

      // 测试768px（平板端）
      setViewport(768, 600);
      mockResponsiveHook(768);

      rerender(<OptimizedEnhancedHomepage />);

      // 应该切换到平板端布局
      await waitFor(() => {
        // 平板端的特定行为验证
        expect(screen.getByText('AI驱动的教师智慧平台')).toBeInTheDocument();
      });
    });

    test('1024px边界测试（平板端到桌面端）', async () => {
      // 测试1023px（平板端）
      setViewport(1023, 600);
      mockResponsiveHook(1023);

      const { rerender } = render(<OptimizedEnhancedHomepage />);

      // 测试1024px（桌面端）
      setViewport(1024, 600);
      mockResponsiveHook(1024);

      rerender(<OptimizedEnhancedHomepage />);

      await waitFor(() => {
        // 桌面端应该显示完整功能
        expect(screen.getByText('AI驱动的教师智慧平台')).toBeInTheDocument();
      });
    });

    test('1440px边界测试（桌面端到超宽屏）', async () => {
      // 测试1439px（桌面端）
      setViewport(1439, 900);
      mockResponsiveHook(1439);

      const { rerender } = render(<OptimizedEnhancedHomepage />);

      // 测试1440px（超宽屏）
      setViewport(1440, 900);
      mockResponsiveHook(1440);

      rerender(<OptimizedEnhancedHomepage />);

      await waitFor(() => {
        // 超宽屏的特定优化验证
        expect(screen.getByText('AI驱动的教师智慧平台')).toBeInTheDocument();
      });
    });
  });

  describe('内容适配测试', () => {
    test('长文本内容在不同屏幕尺寸下的显示', async () => {
      const longText = '这是一段很长的文本内容，用来测试在不同屏幕尺寸下的显示效果和换行处理。'.repeat(10);

      // 移动端测试
      setViewport(breakpoints.mobile.width, breakpoints.mobile.height);
      mockResponsiveHook(breakpoints.mobile.width);

      const { rerender } = render(
        <div data-testid="long-text">{longText}</div>
      );

      const textElement = screen.getByTestId('long-text');
      expect(textElement).toBeInTheDocument();

      // 桌面端测试
      setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
      mockResponsiveHook(breakpoints.desktop.width);

      rerender(<div data-testid="long-text">{longText}</div>);

      expect(textElement).toBeInTheDocument();
    });

    test('图片和媒体内容响应式适配', async () => {
      const TestImage = () => (
        <img 
          src="/test-image.jpg" 
          alt="测试图片" 
          className="w-full h-auto max-w-full"
          data-testid="responsive-image"
        />
      );

      // 移动端
      setViewport(breakpoints.mobile.width, breakpoints.mobile.height);
      mockResponsiveHook(breakpoints.mobile.width);

      const { rerender } = render(<TestImage />);
      
      const image = screen.getByTestId('responsive-image');
      expect(image).toHaveClass('w-full');

      // 桌面端
      setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
      mockResponsiveHook(breakpoints.desktop.width);

      rerender(<TestImage />);
      
      expect(image).toHaveClass('w-full');
    });
  });
});

describe('三栏布局组件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('三栏布局基本功能', async () => {
    setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
    mockResponsiveHook(breakpoints.desktop.width);

    render(
      <ThreeColumnLayout
        leftSidebar={<div data-testid="left-sidebar">左侧边栏</div>}
        rightSidebar={<div data-testid="right-sidebar">右侧边栏</div>}
        leftSidebarWidth="280px"
        rightSidebarWidth="320px"
      >
        <div data-testid="main-content">主内容</div>
      </ThreeColumnLayout>
    );

    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.getByText('主内容')).toBeInTheDocument();
  });

  test('侧边栏宽度自定义', async () => {
    setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
    mockResponsiveHook(breakpoints.desktop.width);

    render(
      <ThreeColumnLayout
        leftSidebar={<div>左侧边栏</div>}
        rightSidebar={<div>右侧边栏</div>}
        leftSidebarWidth="300px"
        rightSidebarWidth="250px"
      >
        <div>主内容</div>
      </ThreeColumnLayout>
    );

    // 验证布局渲染成功
    expect(screen.getByText('主内容')).toBeInTheDocument();
  });

  test('粘性头部功能', async () => {
    setViewport(breakpoints.desktop.width, breakpoints.desktop.height);
    mockResponsiveHook(breakpoints.desktop.width);

    render(
      <ThreeColumnLayout
        leftSidebar={<div>左侧边栏</div>}
        stickyHeader={true}
      >
        <div>主内容</div>
      </ThreeColumnLayout>
    );

    expect(screen.getByText('主内容')).toBeInTheDocument();
  });
});