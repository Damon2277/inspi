import { useState, useEffect } from 'react';

/**
 * 防抖Hook - 延迟更新值直到指定时间内没有新的更新
 * @param value - 需要防抖的值
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的值
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 防抖回调Hook - 延迟执行回调函数
 * @param callback - 需要防抖的回调函数
 * @param delay - 延迟时间（毫秒）
 * @param deps - 依赖数组
 * @returns 防抖后的回调函数
 */
export function useDebouncedCallback<T extends(...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = [],
): T {
  const [debouncedCallback, setDebouncedCallback] = useState<T>(() => callback);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCallback(() => callback);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [callback, delay, deps]);

  return debouncedCallback;
}
