/**
 * useDebounce Hook 单元测试
 */

import { renderHook, act } from '@testing-library/react';

import { useDebounce, useDebouncedCallback } from '@/shared/hooks/useDebounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useDebounce', () => {
    test('应该返回初始值', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));

      expect(result.current).toBe('initial');
    });

    test('应该在延迟后更新值', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 500 },
        },
      );

      expect(result.current).toBe('initial');

      // 更新值
      rerender({ value: 'updated', delay: 500 });
      expect(result.current).toBe('initial'); // 还没有更新

      // 快进时间
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');
    });

    test('应该重置定时器当值频繁变化时', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 500 },
        },
      );

      // 快速连续更新值
      rerender({ value: 'update1', delay: 500 });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      rerender({ value: 'update2', delay: 500 });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      rerender({ value: 'final', delay: 500 });

      // 此时应该还是初始值
      expect(result.current).toBe('initial');

      // 等待完整的延迟时间
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('final');
    });

    test('应该处理不同类型的值', () => {
      // 测试数字
      const { result: numberResult, rerender: numberRerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 0, delay: 100 },
        },
      );

      numberRerender({ value: 42, delay: 100 });
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(numberResult.current).toBe(42);

      // 测试对象
      const { result: objectResult, rerender: objectRerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: { a: 1 }, delay: 100 },
        },
      );

      const newObj = { a: 2, b: 3 };
      objectRerender({ value: newObj, delay: 100 });
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(objectResult.current).toEqual(newObj);
    });

    test('应该处理延迟时间变化', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 500 },
        },
      );

      rerender({ value: 'updated', delay: 100 });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current).toBe('updated');
    });
  });

  describe('useDebouncedCallback', () => {
    test('应该返回防抖后的回调函数', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() =>
        useDebouncedCallback(mockCallback, 500),
      );

      expect(typeof result.current).toBe('function');
    });

    test('应该延迟执行回调函数', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() =>
        useDebouncedCallback(mockCallback, 500),
      );

      // 调用防抖后的回调
      result.current('arg1', 'arg2');

      // 立即检查，应该还没有执行
      expect(mockCallback).not.toHaveBeenCalled();

      // 快进时间
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockCallback).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('应该处理依赖数组变化', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ callback, deps }) => useDebouncedCallback(callback, 500, deps),
        {
          initialProps: { callback: mockCallback1, deps: ['dep1'] },
        },
      );

      // 更新依赖
      rerender({ callback: mockCallback2, deps: ['dep2'] });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // 应该使用新的回调函数
      result.current();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockCallback2).toHaveBeenCalled();
      expect(mockCallback1).not.toHaveBeenCalled();
    });

    test('应该处理空依赖数组', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() =>
        useDebouncedCallback(mockCallback, 500, []),
      );

      result.current('test');

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockCallback).toHaveBeenCalledWith('test');
    });

    test('应该清理定时器', () => {
      const mockCallback = jest.fn();
      const { result, unmount } = renderHook(() =>
        useDebouncedCallback(mockCallback, 500),
      );

      result.current('test');

      // 在定时器完成前卸载组件
      unmount();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // 回调不应该被执行
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
