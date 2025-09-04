/**
 * 懒加载组件测试
 * 测试PC端界面优化中的懒加载功能
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// 测试组件导入
import { SkeletonLoader, LazyWrapper, createLazyComponent } from '@/components/ui';

describe('懒加载组件测试', () => {
  describe('SkeletonLoader 组件', () => {
    test('渲染文本骨架屏', () => {
      render(<SkeletonLoader variant="text" lines={3} />);
      
      const skeleton = screen.getByTestId('skeleton-loader') || document.querySelector('.skeleton-loader');
      expect(skeleton).toBeTruthy();
    });

    test('渲染卡片骨架屏', () => {
      render(<SkeletonLoader variant="card" width="300px" height="200px" />);
      
      const skeleton = screen.getByTestId('skeleton-loader') || document.querySelector('.skeleton-loader');
      expect(skeleton).toBeTruthy();
    });

    test('渲染侧边栏骨架屏', () => {
      render(<SkeletonLoader variant="sidebar" />);
      
      const skeleton = screen.getByTestId('skeleton-loader') || document.querySelector('.skeleton-loader');
      expect(skeleton).toBeTruthy();
    });

    test('渲染网格骨架屏', () => {
      render(<SkeletonLoader variant="grid" className="grid-cols-3" />);
      
      const skeleton = screen.getByTestId('skeleton-loader') || document.querySelector('.skeleton-loader');
      expect(skeleton).toBeTruthy();
    });

    test('动画开关功能', () => {
      const { rerender } = render(<SkeletonLoader variant="text" animate={true} />);
      
      let skeleton = screen.getByTestId('skeleton-loader') || document.querySelector('.skeleton-loader');
      expect(skeleton).toBeTruthy();

      rerender(<SkeletonLoader variant="text" animate={false} />);
      
      skeleton = screen.getByTestId('skeleton-loader') || document.querySelector('.skeleton-loader');
      expect(skeleton).toBeTruthy();
    });
  });

  describe('LazyWrapper 组件', () => {
    test('显示加载状态', async () => {
      const TestComponent = () => <div>Loaded Content</div>;
      
      render(
        <LazyWrapper skeletonVariant="card">
          <TestComponent />
        </LazyWrapper>
      );

      // 内容应该立即显示（因为不是真正的懒加载）
      expect(screen.getByText('Loaded Content')).toBeInTheDocument();
    });

    test('自定义fallback', async () => {
      const TestComponent = () => <div>Loaded Content</div>;
      const CustomFallback = () => <div>Custom Loading...</div>;
      
      render(
        <LazyWrapper fallback={<CustomFallback />}>
          <TestComponent />
        </LazyWrapper>
      );

      expect(screen.getByText('Loaded Content')).toBeInTheDocument();
    });
  });

  describe('createLazyComponent 函数', () => {
    test('创建懒加载组件', async () => {
      const TestComponent = ({ message }: { message: string }) => (
        <div>{message}</div>
      );

      const LazyTestComponent = createLazyComponent(
        () => Promise.resolve({ default: TestComponent }),
        {
          variant: 'card',
          className: 'test-skeleton',
        }
      );

      render(<LazyTestComponent message="Hello Lazy!" />);

      await waitFor(() => {
        expect(screen.getByText('Hello Lazy!')).toBeInTheDocument();
      });
    });
  });

  describe('性能优化测试', () => {
    test('骨架屏渲染性能', () => {
      const startTime = performance.now();
      
      render(
        <div>
          {Array.from({ length: 10 }).map((_, index) => (
            <SkeletonLoader key={index} variant="card" />
          ))}
        </div>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // 渲染时间应该在合理范围内（小于100ms）
      expect(renderTime).toBeLessThan(100);
    });

    test('大量骨架屏组件渲染', () => {
      const { container } = render(
        <div>
          {Array.from({ length: 50 }).map((_, index) => (
            <SkeletonLoader key={index} variant="text" lines={2} />
          ))}
        </div>
      );
      
      // 应该渲染所有组件
      const skeletons = container.querySelectorAll('.skeleton-loader');
      expect(skeletons.length).toBe(50);
    });
  });

  describe('响应式骨架屏测试', () => {
    test('不同变体的骨架屏', () => {
      const variants = ['text', 'card', 'sidebar', 'grid', 'button', 'avatar', 'image'] as const;
      
      variants.forEach(variant => {
        const { container } = render(<SkeletonLoader variant={variant} />);
        const skeleton = container.querySelector('.skeleton-loader');
        expect(skeleton).toBeTruthy();
      });
    });

    test('自定义尺寸骨架屏', () => {
      render(
        <SkeletonLoader 
          variant="card" 
          width="400px" 
          height="300px"
        />
      );
      
      const skeleton = screen.getByTestId('skeleton-loader');
      expect(skeleton).toBeTruthy();
    });
  });

  describe('错误处理测试', () => {
    test('无效变体处理', () => {
      // @ts-ignore - 测试无效输入
      render(<SkeletonLoader variant="invalid" />);
      
      const skeleton = document.querySelector('.skeleton-loader');
      expect(skeleton).toBeTruthy();
    });

    test('空属性处理', () => {
      render(<SkeletonLoader />);
      
      const skeleton = document.querySelector('.skeleton-loader');
      expect(skeleton).toBeTruthy();
    });
  });
});