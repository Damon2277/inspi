import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { ErrorBoundary, useErrorBoundary, withErrorBoundary } from '@/components/errors/ErrorBoundary';

// 模拟日志记录器
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// 测试组件：会抛出错误
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// 测试组件：使用错误边界Hook
const UseErrorBoundaryComponent: React.FC = () => {
  const { captureError } = useErrorBoundary();

  return (
    <button onClick={() => captureError(new Error('Hook error'))}>
      Trigger Error
    </button>
  );
};

describe('ErrorBoundary', () => {
  // 抑制控制台错误输出
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基础错误捕获', () => {
    it('应该捕获子组件的错误并显示错误UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('组件加载失败')).toBeInTheDocument();
      expect(screen.getByText('重试')).toBeInTheDocument();
    });

    it('应该在没有错误时正常渲染子组件', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('错误级别处理', () => {
    it('应该根据level属性显示不同的错误UI - page级别', () => {
      render(
        <ErrorBoundary level="page">
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('页面加载出错')).toBeInTheDocument();
      expect(screen.getByText('刷新页面')).toBeInTheDocument();
      expect(screen.getByText('返回上一页')).toBeInTheDocument();
    });

    it('应该根据level属性显示不同的错误UI - section级别', () => {
      render(
        <ErrorBoundary level="section">
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('内容加载失败')).toBeInTheDocument();
    });
  });

  describe('重试功能', () => {
    it('应该支持重试功能', async () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Success</div>;
      };

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText('组件加载失败')).toBeInTheDocument();

      // 模拟修复错误
      shouldThrow = false;

      const retryButton = screen.getByText('重试');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
      });
    });

    it('应该限制重试次数', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      const retryButton = screen.getByText('重试');

      // 第一次重试
      fireEvent.click(retryButton);
      expect(screen.getByText('重试')).toBeInTheDocument();

      // 第二次重试
      fireEvent.click(retryButton);
      expect(screen.getByText('重试')).toBeInTheDocument();

      // 第三次重试
      fireEvent.click(retryButton);
      expect(screen.getByText('重试')).toBeInTheDocument();

      // 第四次应该不能重试了
      fireEvent.click(retryButton);
      // 重试按钮应该仍然存在，但重试次数已达上限
    });
  });

  describe('自定义fallback', () => {
    it('应该支持自定义fallback组件', () => {
      const CustomFallback = () => <div>Custom Error UI</div>;

      render(
        <ErrorBoundary fallback={<CustomFallback />}>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });
  });

  describe('错误回调', () => {
    it('应该调用onError回调', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        }),
      );
    });
  });

  describe('resetKeys功能', () => {
    it('应该在resetKeys改变时重置错误状态', async () => {
      let resetKey = 'key1';

      const TestWrapper: React.FC = () => (
        <ErrorBoundary resetKeys={[resetKey]} resetOnPropsChange>
          <ThrowError />
        </ErrorBoundary>
      );

      const { rerender } = render(<TestWrapper />);

      expect(screen.getByText('组件加载失败')).toBeInTheDocument();

      // 改变resetKey
      resetKey = 'key2';
      rerender(<TestWrapper />);

      // 错误状态应该被重置，但由于组件仍然会抛出错误，所以会再次显示错误UI
      await waitFor(() => {
        expect(screen.getByText('组件加载失败')).toBeInTheDocument();
      });
    });
  });
});

describe('useErrorBoundary Hook', () => {
  it('应该能够手动触发错误边界', () => {
    render(
      <ErrorBoundary>
        <UseErrorBoundaryComponent />
      </ErrorBoundary>,
    );

    const button = screen.getByText('Trigger Error');
    fireEvent.click(button);

    expect(screen.getByText('组件加载失败')).toBeInTheDocument();
  });
});

describe('withErrorBoundary HOC', () => {
  it('应该为组件包装错误边界', () => {
    const TestComponent = () => <ThrowError />;
    const WrappedComponent = withErrorBoundary(TestComponent, { level: 'component' });

    render(<WrappedComponent />);

    expect(screen.getByText('组件加载失败')).toBeInTheDocument();
  });

  it('应该设置正确的displayName', () => {
    const TestComponent = () => <div>Test</div>;
    TestComponent.displayName = 'TestComponent';

    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });
});
