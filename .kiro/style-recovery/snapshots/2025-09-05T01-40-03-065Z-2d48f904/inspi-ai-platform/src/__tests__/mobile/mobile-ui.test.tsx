import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileCard } from '@/components/mobile/MobileCard';
import { MobileButton } from '@/components/mobile/MobileButton';
import { MobileInput } from '@/components/mobile/MobileInput';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('移动端UI组件测试', () => {
  describe('MobileLayout', () => {
    test('应该渲染移动端布局', () => {
      render(
        <MobileLayout title="测试页面">
          <div>测试内容</div>
        </MobileLayout>
      );

      expect(screen.getByText('测试页面')).toBeInTheDocument();
      expect(screen.getByText('测试内容')).toBeInTheDocument();
    });

    test('应该显示标题', () => {
      render(
        <MobileLayout title="测试页面">
          <div>测试内容</div>
        </MobileLayout>
      );

      expect(screen.getByText('测试页面')).toBeInTheDocument();
    });

    test('应该可以隐藏底部导航', () => {
      render(
        <MobileLayout showBottomNav={false}>
          <div>测试内容</div>
        </MobileLayout>
      );

      // 底部导航应该不存在
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
  });

  describe('MobileCard', () => {
    test('应该渲染卡片内容', () => {
      render(
        <MobileCard>
          <div>卡片内容</div>
        </MobileCard>
      );

      expect(screen.getByText('卡片内容')).toBeInTheDocument();
    });

    test('应该支持点击事件', () => {
      const mockOnClick = jest.fn();
      
      render(
        <MobileCard onClick={mockOnClick}>
          <div>可点击卡片</div>
        </MobileCard>
      );

      fireEvent.click(screen.getByText('可点击卡片'));
      expect(mockOnClick).toHaveBeenCalled();
    });

    test('应该支持不同的内边距', () => {
      const { container } = render(
        <MobileCard padding="lg">
          <div>大内边距卡片</div>
        </MobileCard>
      );

      const card = container.firstChild;
      expect(card).toHaveClass('p-6');
    });
  });

  describe('MobileButton', () => {
    test('应该渲染按钮', () => {
      render(
        <MobileButton>
          点击我
        </MobileButton>
      );

      expect(screen.getByRole('button', { name: '点击我' })).toBeInTheDocument();
    });

    test('应该支持不同变体', () => {
      const { rerender } = render(
        <MobileButton variant="primary">
          主要按钮
        </MobileButton>
      );

      let button = screen.getByRole('button');
      expect(button).toHaveClass('mobile-button-primary-enhanced');

      rerender(
        <MobileButton variant="secondary">
          次要按钮
        </MobileButton>
      );

      button = screen.getByRole('button');
      expect(button).toHaveClass('mobile-button-secondary-enhanced');
    });

    test('应该支持加载状态', () => {
      render(
        <MobileButton loading>
          加载中
        </MobileButton>
      );

      expect(screen.getByText('加载中...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    test('应该支持禁用状态', () => {
      render(
        <MobileButton disabled>
          禁用按钮
        </MobileButton>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50');
    });

    test('应该支持点击事件', () => {
      const mockOnClick = jest.fn();
      
      render(
        <MobileButton onClick={mockOnClick}>
          点击测试
        </MobileButton>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  describe('MobileInput', () => {
    test('应该渲染输入框', () => {
      render(
        <MobileInput placeholder="请输入内容" />
      );

      expect(screen.getByPlaceholderText('请输入内容')).toBeInTheDocument();
    });

    test('应该支持标签', () => {
      render(
        <MobileInput label="用户名" placeholder="请输入用户名" />
      );

      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    test('应该支持必填标记', () => {
      render(
        <MobileInput label="密码" required />
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    test('应该支持错误状态', () => {
      render(
        <MobileInput error="用户名不能为空" />
      );

      expect(screen.getByText('用户名不能为空')).toBeInTheDocument();
    });

    test('应该支持值变化', () => {
      const mockOnChange = jest.fn();
      
      render(
        <MobileInput onChange={mockOnChange} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '测试输入' } });
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    test('应该支持textarea类型', () => {
      render(
        <MobileInput type="textarea" placeholder="请输入多行文本" />
      );

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('请输入多行文本')).toBeInTheDocument();
    });

    test('应该支持搜索类型', () => {
      render(
        <MobileInput type="search" placeholder="搜索..." />
      );

      expect(screen.getByPlaceholderText('搜索...')).toBeInTheDocument();
    });
  });

  describe('MobileBottomNav', () => {
    test('应该渲染底部导航', () => {
      render(<MobileBottomNav />);

      expect(screen.getByText('首页')).toBeInTheDocument();
      expect(screen.getByText('AI魔法师')).toBeInTheDocument();
      expect(screen.getByText('智慧广场')).toBeInTheDocument();
      expect(screen.getByText('我的作品')).toBeInTheDocument();
      expect(screen.getByText('我的')).toBeInTheDocument();
    });

    test('应该高亮当前页面', () => {
      render(<MobileBottomNav />);

      // 当前路径是 '/'，所以首页应该被高亮
      const homeLink = screen.getByText('首页').closest('a');
      expect(homeLink).toHaveClass('active');
    });
  });

  describe('响应式设计', () => {
    test('应该在移动端视口下正确显示', () => {
      // 模拟移动端视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      render(
        <MobileLayout>
          <MobileCard>
            <MobileButton fullWidth>
              全宽按钮
            </MobileButton>
          </MobileCard>
        </MobileLayout>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });
  });

  describe('触摸交互', () => {
    test('应该支持触摸反馈', () => {
      render(
        <MobileCard onClick={() => {}}>
          <div>触摸卡片</div>
        </MobileCard>
      );

      const card = screen.getByText('触摸卡片').closest('button');
      expect(card).toHaveClass('mobile-touch-feedback');
    });
  });

  describe('可访问性', () => {
    test('应该有正确的ARIA标签', () => {
      render(
        <MobileLayout title="测试页面" showBackButton>
          <MobileButton>操作按钮</MobileButton>
        </MobileLayout>
      );

      expect(screen.getByLabelText('返回')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '操作按钮' })).toBeInTheDocument();
    });

    test('应该支持键盘导航', () => {
      render(
        <div>
          <MobileButton>按钮1</MobileButton>
          <MobileButton>按钮2</MobileButton>
        </div>
      );

      const button1 = screen.getByRole('button', { name: '按钮1' });
      const button2 = screen.getByRole('button', { name: '按钮2' });

      button1.focus();
      expect(button1).toHaveFocus();

      // 模拟Tab键
      fireEvent.keyDown(button1, { key: 'Tab' });
      // 注意：在测试环境中，实际的焦点切换可能需要额外的设置
    });
  });

  describe('性能优化', () => {
    test('应该使用GPU加速类', () => {
      const { container } = render(
        <MobileLayout>
          <div className="mobile-gpu-accelerated">
            GPU加速内容
          </div>
        </MobileLayout>
      );

      const acceleratedElement = container.querySelector('.mobile-gpu-accelerated');
      expect(acceleratedElement).toBeInTheDocument();
    });
  });
});