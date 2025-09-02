import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { GlobalErrorBoundary } from '@/components/errors/GlobalErrorBoundary';
import { ToastContainer, toast } from '@/components/ui/ErrorToast';
import { useErrorHandler } from '@/hooks/useErrorHandler';

// 模拟日志记录器
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

// 模拟CustomError
jest.mock('@/lib/errors/CustomError', () => ({
  CustomError: {
    fromError: jest.fn((error, code, context) => ({
      ...error,
      code,
      context,
      message: error.message,
      userMessage: error.message,
      retryable: true,
      isClientError: () => false,
      isServerError: () => true,
      httpStatus: 500,
      toJSON: () => ({ message: error.message, code, context })
    }))
  }
}));

// 测试组件：会抛出错误
const ThrowErrorComponent: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = true, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="success">组件正常工作</div>;
};

// 测试组件：使用错误处理Hook
const ErrorHandlerTestComponent: React.FC = () => {
  const { error, isError, handleError, clearError, wrapAsync } = useErrorHandler();

  const asyncOperation = wrapAsync(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('异步操作失败');
  });

  return (
    <div>
      {isError && error && (
        <div data-testid="error-display">
          错误: {error.message}
          <button data-testid="clear-error" onClick={clearError}>
            清除错误
          </button>
        </div>
      )}
      <button data-testid="trigger-sync-error" onClick={() => handleError('同步错误')}>
        触发同步错误
      </button>
      <button data-testid="trigger-async-error" onClick={asyncOperation}>
        触发异步错误
      </button>
    </div>
  );
};

// 测试组件：Toast集成
const ToastTestComponent: React.FC = () => {
  return (
    <div>
      <button
        data-testid="show-error-toast"
        onClick={() => toast.error('这是一个错误提示')}
      >
        显示错误Toast
      </button>
      <button
        data-testid="show-success-toast"
        onClick={() => toast.success('操作成功')}
      >
        显示成功Toast
      </button>
      <ToastContainer />
    </div>
  );
};

describe('错误处理集成测试', () => {
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

  describe('错误边界集成', () => {
    it('应该捕获组件错误并显示错误UI', () => {
      render(
        <ErrorBoundary level="component">
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('组件加载失败')).toBeInTheDocument();
      expect(screen.getByText('重试')).toBeInTheDocument();
    });

    it('应该支持错误恢复', async () => {
      let shouldThrow = true;
      
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('临时错误');
        }
        return <div data-testid="recovered">已恢复</div>;
      };

      render(
        <ErrorBoundary level="component">
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('组件加载失败')).toBeInTheDocument();

      // 修复错误条件
      shouldThrow = false;
      
      // 点击重试
      const retryButton = screen.getByText('重试');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('recovered')).toBeInTheDocument();
      });
    });

    it('应该在全局错误边界中正确处理错误', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowErrorComponent errorMessage="全局错误测试" />
        </GlobalErrorBoundary>
      );

      // 全局错误边界应该显示页面级错误UI
      expect(screen.getByText('应用遇到了问题')).toBeInTheDocument();
    });
  });

  describe('错误处理Hook集成', () => {
    it('应该正确处理同步错误', () => {
      render(<ErrorHandlerTestComponent />);

      const triggerButton = screen.getByTestId('trigger-sync-error');
      fireEvent.click(triggerButton);

      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByText('错误: 同步错误')).toBeInTheDocument();
    });

    it('应该正确处理异步错误', async () => {
      render(<ErrorHandlerTestComponent />);

      const triggerButton = screen.getByTestId('trigger-async-error');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
        expect(screen.getByText('错误: 异步操作失败')).toBeInTheDocument();
      });
    });

    it('应该支持清除错误', () => {
      render(<ErrorHandlerTestComponent />);

      // 先触发错误
      const triggerButton = screen.getByTestId('trigger-sync-error');
      fireEvent.click(triggerButton);

      expect(screen.getByTestId('error-display')).toBeInTheDocument();

      // 清除错误
      const clearButton = screen.getByTestId('clear-error');
      fireEvent.click(clearButton);

      expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
    });
  });

  describe('Toast通知集成', () => {
    it('应该显示错误Toast', async () => {
      render(<ToastTestComponent />);

      const showErrorButton = screen.getByTestId('show-error-toast');
      fireEvent.click(showErrorButton);

      await waitFor(() => {
        expect(screen.getByText('这是一个错误提示')).toBeInTheDocument();
      });
    });

    it('应该显示成功Toast', async () => {
      render(<ToastTestComponent />);

      const showSuccessButton = screen.getByTestId('show-success-toast');
      fireEvent.click(showSuccessButton);

      await waitFor(() => {
        expect(screen.getByText('操作成功')).toBeInTheDocument();
      });
    });

    it('应该支持关闭Toast', async () => {
      render(<ToastTestComponent />);

      const showErrorButton = screen.getByTestId('show-error-toast');
      fireEvent.click(showErrorButton);

      await waitFor(() => {
        expect(screen.getByText('这是一个错误提示')).toBeInTheDocument();
      });

      // 查找并点击关闭按钮
      const closeButton = screen.getByRole('button', { name: '关闭' });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('这是一个错误提示')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('错误边界与Hook的协同工作', () => {
    const IntegratedTestComponent: React.FC = () => {
      const { handleError } = useErrorHandler();

      return (
        <div>
          <button
            data-testid="trigger-hook-error"
            onClick={() => handleError('Hook错误')}
          >
            触发Hook错误
          </button>
          <ErrorBoundary level="section">
            <ThrowErrorComponent shouldThrow={false} />
          </ErrorBoundary>
        </div>
      );
    };

    it('应该同时支持错误边界和Hook错误处理', () => {
      render(<IntegratedTestComponent />);

      // Hook错误不应该被错误边界捕获（因为它不是在渲染过程中抛出的）
      const triggerButton = screen.getByTestId('trigger-hook-error');
      fireEvent.click(triggerButton);

      // 错误边界内的组件应该正常渲染
      expect(screen.getByTestId('success')).toBeInTheDocument();
    });
  });

  describe('错误恢复场景', () => {
    it('应该支持网络错误恢复', async () => {
      let networkError = true;
      
      const NetworkTestComponent = () => {
        const { error, isError, wrapAsync, clearError } = useErrorHandler();

        const networkRequest = wrapAsync(async () => {
          if (networkError) {
            throw new Error('网络连接失败');
          }
          return '请求成功';
        });

        return (
          <div>
            {isError && error && (
              <div data-testid="network-error">
                {error.message}
                <button data-testid="retry-network" onClick={() => {
                  clearError();
                  networkRequest();
                }}>
                  重试
                </button>
              </div>
            )}
            <button data-testid="make-request" onClick={networkRequest}>
              发起请求
            </button>
          </div>
        );
      };

      render(<NetworkTestComponent />);

      // 触发网络错误
      const requestButton = screen.getByTestId('make-request');
      fireEvent.click(requestButton);

      await waitFor(() => {
        expect(screen.getByTestId('network-error')).toBeInTheDocument();
        expect(screen.getByText('网络连接失败')).toBeInTheDocument();
      });

      // 修复网络问题
      networkError = false;

      // 重试请求
      const retryButton = screen.getByTestId('retry-network');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByTestId('network-error')).not.toBeInTheDocument();
      });
    });
  });

  describe('错误日志记录', () => {
    it('应该记录错误边界捕获的错误', () => {
      const { logger } = require('@/lib/logging/logger');

      render(
        <ErrorBoundary level="component">
          <ThrowErrorComponent errorMessage="日志测试错误" />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'React Error Boundary caught an error',
        expect.any(Object),
        expect.objectContaining({
          metadata: expect.objectContaining({
            componentStack: expect.any(String)
          })
        })
      );
    });

    it('应该记录Hook处理的错误', () => {
      const { logger } = require('@/lib/logging/logger');

      render(<ErrorHandlerTestComponent />);

      const triggerButton = screen.getByTestId('trigger-sync-error');
      fireEvent.click(triggerButton);

      expect(logger.error).toHaveBeenCalledWith(
        'Error handled by useErrorHandler',
        expect.any(Object),
        expect.objectContaining({
          metadata: expect.objectContaining({
            errorId: expect.any(String)
          })
        })
      );
    });
  });
});