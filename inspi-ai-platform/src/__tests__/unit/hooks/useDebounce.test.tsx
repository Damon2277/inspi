/**
 * useDebounce Hook 测试
 * 测试防抖功能的时序控制和性能优化
 */

import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '@/hooks/useDebounce';

// Mock timers
jest.useFakeTimers();

describe('useDebounce Hook Tests', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('基础防抖功能', () => {
    it('应该返回初始值', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));

      expect(result.current).toBe('initial');
    });

    it('应该在延迟后更新值', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      expect(result.current).toBe('initial');

      // 更新值
      rerender({ value: 'updated', delay: 500 });

      // 值应该还是初始值
      expect(result.current).toBe('initial');

      // 快进时间
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // 现在值应该更新了
      expect(result.current).toBe('updated');
    });

    it('应该重置计时器当值频繁变化时', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
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

      // 值应该还是初始值
      expect(result.current).toBe('initial');

      // 完成最后一次延迟
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // 应该是最后一次更新的值
      expect(result.current).toBe('final');
    });

    it('应该处理不同的延迟时间', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 1000 } }
      );

      rerender({ value: 'updated', delay: 1000 });

      // 500ms后还不应该更新
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current).toBe('initial');

      // 1000ms后应该更新
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current).toBe('updated');
    });

    it('应该处理延迟时间的变化', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      rerender({ value: 'updated', delay: 1000 }); // 改变延迟时间

      // 500ms后不应该更新（因为延迟时间变成了1000ms）
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current).toBe('initial');

      // 1000ms后应该更新
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current).toBe('updated');
    });
  });

  describe('数据类型测试', () => {
    it('应该处理字符串类型', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'hello' } }
      );

      rerender({ value: 'world' });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe('world');
    });

    it('应该处理数字类型', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 0 } }
      );

      rerender({ value: 42 });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe(42);
    });

    it('应该处理对象类型', () => {
      const initialObj = { name: 'initial', count: 0 };
      const updatedObj = { name: 'updated', count: 1 };

      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: initialObj } }
      );

      rerender({ value: updatedObj });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toEqual(updatedObj);
    });

    it('应该处理数组类型', () => {
      const initialArray = [1, 2, 3];
      const updatedArray = [4, 5, 6];

      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: initialArray } }
      );

      rerender({ value: updatedArray });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toEqual(updatedArray);
    });

    it('应该处理null和undefined', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: null });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBeNull();

      rerender({ value: undefined });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBeUndefined();
    });
  });

  describe('边界条件测试', () => {
    it('应该处理零延迟', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 0),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      // 即使是0延迟，也应该在下一个tick更新
      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current).toBe('updated');
    });

    it('应该处理负延迟', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, -100),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      act(() => {
        jest.advanceTimersByTime(0);
      });

      // 负延迟应该被当作0处理
      expect(result.current).toBe('updated');
    });

    it('应该处理非常大的延迟', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 999999),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      act(() => {
        jest.advanceTimersByTime(999998);
      });

      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(result.current).toBe('updated');
    });
  });

  describe('性能测试', () => {
    it('应该正确清理定时器', () => {
      const { unmount, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      // 记录当前定时器数量
      const timerCount = jest.getTimerCount();

      unmount();

      // 定时器应该被清理
      expect(jest.getTimerCount()).toBeLessThan(timerCount);
    });

    it('应该处理快速连续的值变化', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 100),
        { initialProps: { value: 0 } }
      );

      // 快速连续更新100次
      for (let i = 1; i <= 100; i++) {
        rerender({ value: i });
        act(() => {
          jest.advanceTimersByTime(50); // 不足以触发更新
        });
      }

      expect(result.current).toBe(0); // 还是初始值

      // 等待足够的时间
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current).toBe(100); // 最后一次更新的值
    });
  });

  describe('实际使用场景测试', () => {
    it('应该适用于搜索输入防抖', () => {
      const { result, rerender } = renderHook(
        ({ searchTerm }) => useDebounce(searchTerm, 300),
        { initialProps: { searchTerm: '' } }
      );

      // 模拟用户快速输入
      rerender({ searchTerm: 'r' });
      rerender({ searchTerm: 're' });
      rerender({ searchTerm: 'rea' });
      rerender({ searchTerm: 'reac' });
      rerender({ searchTerm: 'react' });

      // 输入过程中不应该触发搜索
      expect(result.current).toBe('');

      // 用户停止输入300ms后才触发搜索
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe('react');
    });

    it('应该适用于窗口尺寸变化防抖', () => {
      const { result, rerender } = renderHook(
        ({ windowSize }) => useDebounce(windowSize, 150),
        { initialProps: { windowSize: { width: 1024, height: 768 } } }
      );

      // 模拟窗口快速调整大小
      const sizes = [
        { width: 1025, height: 769 },
        { width: 1026, height: 770 },
        { width: 1027, height: 771 },
        { width: 1028, height: 772 },
      ];

      sizes.forEach(size => {
        rerender({ windowSize: size });
        act(() => {
          jest.advanceTimersByTime(100); // 不足以触发更新
        });
      });

      expect(result.current).toEqual({ width: 1024, height: 768 });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current).toEqual({ width: 1028, height: 772 });
    });
  });
});

describe('useDebouncedCallback Hook Tests', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('基础回调防抖功能', () => {
    it('应该返回防抖后的回调函数', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 300)
      );

      expect(typeof result.current).toBe('function');
    });

    it('应该在延迟后执行回调', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 300)
      );

      // 调用防抖回调
      act(() => {
        result.current('test');
      });

      // 立即检查，回调不应该被执行
      expect(mockCallback).not.toHaveBeenCalled();

      // 等待延迟时间
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // 现在回调应该被执行
      expect(mockCallback).toHaveBeenCalledWith('test');
    });

    it('应该取消之前的调用当新调用发生时', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 300)
      );

      // 第一次调用
      act(() => {
        result.current('first');
      });

      // 等待一半时间
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // 第二次调用（应该取消第一次）
      act(() => {
        result.current('second');
      });

      // 完成第二次调用的延迟
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // 只有第二次调用应该被执行
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith('second');
    });

    it('应该处理多个参数', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 300)
      );

      act(() => {
        result.current('arg1', 'arg2', 'arg3');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockCallback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('应该处理无参数调用', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 300)
      );

      act(() => {
        result.current();
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockCallback).toHaveBeenCalledWith();
    });
  });

  describe('依赖数组测试', () => {
    it('应该在依赖变化时更新回调', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ callback, deps }) => useDebouncedCallback(callback, 300, deps),
        { 
          initialProps: { 
            callback: mockCallback1, 
            deps: ['dep1'] 
          } 
        }
      );

      // 使用第一个回调
      act(() => {
        result.current('test1');
      });

      // 更改依赖和回调
      rerender({ 
        callback: mockCallback2, 
        deps: ['dep2'] 
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // 应该使用新的回调
      act(() => {
        result.current('test2');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockCallback2).toHaveBeenCalledWith('test2');
    });

    it('应该在依赖不变时保持相同的回调引用', () => {
      const mockCallback = jest.fn();
      const { result, rerender } = renderHook(
        ({ deps }) => useDebouncedCallback(mockCallback, 300, deps),
        { initialProps: { deps: ['dep1'] } }
      );

      const firstCallback = result.current;

      // 重新渲染但依赖不变
      rerender({ deps: ['dep1'] });

      const secondCallback = result.current;

      expect(firstCallback).toBe(secondCallback);
    });
  });

  describe('错误处理测试', () => {
    it('应该处理回调函数抛出的错误', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      const { result } = renderHook(() => 
        useDebouncedCallback(errorCallback, 300)
      );

      act(() => {
        result.current();
      });

      // 错误应该在延迟后抛出
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(300);
        });
      }).toThrow('Callback error');
    });

    it('应该处理异步回调', async () => {
      const asyncCallback = jest.fn().mockResolvedValue('async result');
      const { result } = renderHook(() => 
        useDebouncedCallback(asyncCallback, 300)
      );

      act(() => {
        result.current();
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(asyncCallback).toHaveBeenCalled();
    });
  });

  describe('性能和内存测试', () => {
    it('应该在组件卸载时清理定时器', () => {
      const mockCallback = jest.fn();
      const { result, unmount } = renderHook(() => 
        useDebouncedCallback(mockCallback, 300)
      );

      act(() => {
        result.current();
      });

      const timerCount = jest.getTimerCount();
      
      unmount();

      expect(jest.getTimerCount()).toBeLessThan(timerCount);
    });

    it('应该处理高频调用', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 100)
      );

      // 高频调用
      for (let i = 0; i < 1000; i++) {
        act(() => {
          result.current(i);
        });
      }

      // 只有最后一次调用应该被执行
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(999);
    });
  });

  describe('实际使用场景测试', () => {
    it('应该适用于API调用防抖', () => {
      const mockApiCall = jest.fn().mockResolvedValue({ data: 'success' });
      const { result } = renderHook(() => 
        useDebouncedCallback(mockApiCall, 500)
      );

      // 模拟用户快速点击按钮
      act(() => {
        result.current({ query: 'search1' });
        result.current({ query: 'search2' });
        result.current({ query: 'search3' });
      });

      // API不应该被立即调用
      expect(mockApiCall).not.toHaveBeenCalled();

      // 等待防抖延迟
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // 只应该调用一次，使用最后的参数
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(mockApiCall).toHaveBeenCalledWith({ query: 'search3' });
    });

    it('应该适用于表单验证防抖', () => {
      const mockValidate = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockValidate, 300)
      );

      // 模拟用户输入
      const inputValues = ['a', 'ab', 'abc', 'abcd', 'abcde'];
      
      inputValues.forEach(value => {
        act(() => {
          result.current(value);
        });
        // 模拟快速输入
        act(() => {
          jest.advanceTimersByTime(50);
        });
      });

      // 验证不应该被调用
      expect(mockValidate).not.toHaveBeenCalled();

      // 用户停止输入后触发验证
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockValidate).toHaveBeenCalledTimes(1);
      expect(mockValidate).toHaveBeenCalledWith('abcde');
    });
  });
});