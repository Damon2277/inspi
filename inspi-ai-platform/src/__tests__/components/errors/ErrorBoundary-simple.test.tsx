import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { ErrorBoundary } from '@/components/errors/ErrorBoundary';

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
  return <div data-testid="success">No error</div>;
};

describe('ErrorBoundary - 简化测试', () => {
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

  it('应该捕获子组件的错误并显示错误UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    // 检查是否显示了错误UI（使用实际渲染的文本）
    expect(screen.getByText('组件渲染出错')).toBeInTheDocument();
    expect(screen.getByText('重试')).toBeInTheDocument();
  });

  it('应该在没有错误时正常渲染子组件', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('success')).toBeInTheDocument();
  });

  it('应该根据level属性显示不同的错误UI - page级别', () => {
    render(
      <ErrorBoundary level="page">
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByText('页面加载出错')).toBeInTheDocument();
    expect(screen.getByText('刷新页面')).toBeInTheDocument();
  });

  it('应该支持重试功能', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByText('组件渲染出错')).toBeInTheDocument();

    const retryButton = screen.getByText('重试');
    expect(retryButton).toBeInTheDocument();

    // 点击重试按钮
    fireEvent.click(retryButton);

    // 错误UI应该仍然存在（因为组件仍然会抛出错误）
    expect(screen.getByText('组件渲染出错')).toBeInTheDocument();
  });

  it('应该支持自定义fallback组件', () => {
    const CustomFallback = () => <div data-testid="custom-error">Custom Error UI</div>;

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('custom-error')).toBeInTheDocument();
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
  });

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
