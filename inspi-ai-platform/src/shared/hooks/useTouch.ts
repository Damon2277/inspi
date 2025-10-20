/**
 * 移动端触摸交互优化Hook
 * 提供触摸手势识别和优化
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';

import { useIsTouchDevice } from './useResponsive';

interface TouchPoint {
  x: number
  y: number
  timestamp: number
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down'
  distance: number
  duration: number
  velocity: number
}

interface TouchOptions {
  // 滑动手势配置
  swipeThreshold?: number      // 最小滑动距离
  swipeTimeout?: number        // 最大滑动时间
  velocityThreshold?: number   // 最小滑动速度

  // 长按配置
  longPressDelay?: number      // 长按延迟时间
  longPressMoveThreshold?: number // 长按移动容忍度

  // 双击配置
  doubleTapDelay?: number      // 双击间隔时间
  doubleTapDistance?: number   // 双击位置容忍度
}

const defaultOptions: Required<TouchOptions> = {
  swipeThreshold: 50,
  swipeTimeout: 300,
  velocityThreshold: 0.3,
  longPressDelay: 500,
  longPressMoveThreshold: 10,
  doubleTapDelay: 300,
  doubleTapDistance: 25,
};

interface TouchHandlers {
  onSwipe?: (gesture: SwipeGesture) => void
  onLongPress?: (point: TouchPoint) => void
  onDoubleTap?: (point: TouchPoint) => void
  onTouchStart?: (point: TouchPoint) => void
  onTouchEnd?: (point: TouchPoint) => void
  onTouchMove?: (point: TouchPoint) => void
}

export const useTouch = (
  elementRef: React.RefObject<HTMLElement>,
  handlers: TouchHandlers = {},
  options: TouchOptions = {},
) => {
  const isTouchDevice = useIsTouchDevice();
  const config = useMemo(() => ({ ...defaultOptions, ...options }), [options]);

  const touchStartRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<TouchPoint | null>(null);
  const doubleTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 获取触摸点坐标
  const getTouchPoint = useCallback((event: TouchEvent | MouseEvent): TouchPoint => {
    const touch = 'touches' in event ? event.touches[0] || event.changedTouches[0] : event;
    return {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };
  }, []);

  // 计算两点距离
  const getDistance = useCallback((point1: TouchPoint, point2: TouchPoint): number => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // 计算滑动方向
  const getSwipeDirection = useCallback((start: TouchPoint, end: TouchPoint): 'left' | 'right' | 'up' | 'down' => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }, []);

  // 处理触摸开始
  const handleTouchStart = useCallback((event: TouchEvent | MouseEvent) => {
    const point = getTouchPoint(event);
    touchStartRef.current = point;

    // 触发开始回调
    handlers.onTouchStart?.(point);

    // 设置长按定时器
    if (handlers.onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        if (touchStartRef.current) {
          handlers.onLongPress!(touchStartRef.current);
        }
      }, config.longPressDelay);
    }
  }, [getTouchPoint, handlers, config.longPressDelay]);

  // 处理触摸移动
  const handleTouchMove = useCallback((event: TouchEvent | MouseEvent) => {
    const point = getTouchPoint(event);

    // 触发移动回调
    handlers.onTouchMove?.(point);

    // 检查是否超出长按移动容忍度
    if (touchStartRef.current && longPressTimerRef.current) {
      const distance = getDistance(touchStartRef.current, point);
      if (distance > config.longPressMoveThreshold) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, [getTouchPoint, handlers, getDistance, config.longPressMoveThreshold]);

  // 处理触摸结束
  const handleTouchEnd = useCallback((event: TouchEvent | MouseEvent) => {
    const point = getTouchPoint(event);

    // 清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // 触发结束回调
    handlers.onTouchEnd?.(point);

    if (!touchStartRef.current) return;

    const startPoint = touchStartRef.current;
    const distance = getDistance(startPoint, point);
    const duration = point.timestamp - startPoint.timestamp;

    // 检查滑动手势
    if (handlers.onSwipe && distance >= config.swipeThreshold && duration <= config.swipeTimeout) {
      const velocity = distance / duration;
      if (velocity >= config.velocityThreshold) {
        const direction = getSwipeDirection(startPoint, point);
        handlers.onSwipe({
          direction,
          distance,
          duration,
          velocity,
        });
      }
    }

    // 检查双击手势
    if (handlers.onDoubleTap) {
      if (lastTapRef.current) {
        const timeDiff = point.timestamp - lastTapRef.current.timestamp;
        const distanceDiff = getDistance(lastTapRef.current, point);

        if (timeDiff <= config.doubleTapDelay && distanceDiff <= config.doubleTapDistance) {
          handlers.onDoubleTap(point);
          lastTapRef.current = null;
          if (doubleTapTimerRef.current) {
            clearTimeout(doubleTapTimerRef.current);
            doubleTapTimerRef.current = null;
          }
        } else {
          lastTapRef.current = point;
        }
      } else {
        lastTapRef.current = point;
        doubleTapTimerRef.current = setTimeout(() => {
          lastTapRef.current = null;
        }, config.doubleTapDelay);
      }
    }

    touchStartRef.current = null;
  }, [getTouchPoint, handlers, getDistance, getSwipeDirection, config]);

  // 绑定事件监听器
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !isTouchDevice) return;

    // 阻止默认的触摸行为
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // 绑定触摸事件
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    // 绑定鼠标事件（用于桌面端测试）
    element.addEventListener('mousedown', handleTouchStart);
    element.addEventListener('mousemove', handleTouchMove);
    element.addEventListener('mouseup', handleTouchEnd);

    // 阻止多点触摸的默认行为
    element.addEventListener('touchstart', preventDefault, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);

      element.removeEventListener('mousedown', handleTouchStart);
      element.removeEventListener('mousemove', handleTouchMove);
      element.removeEventListener('mouseup', handleTouchEnd);

      element.removeEventListener('touchstart', preventDefault);

      // 清理定时器
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (doubleTapTimerRef.current) {
        clearTimeout(doubleTapTimerRef.current);
      }
    };
  }, [elementRef, isTouchDevice, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isTouchDevice,
    isActive: touchStartRef.current !== null,
  };
};

// 触摸反馈Hook
export const useTouchFeedback = () => {
  const addTouchFeedback = useCallback((element: HTMLElement, intensity: 'light' | 'medium' | 'strong' = 'medium') => {
    const feedbackClass = {
      light: 'scale-98',
      medium: 'scale-95',
      strong: 'scale-90',
    }[intensity];

    element.style.transform = `scale(${intensity === 'light' ? '0.98' : intensity === 'medium' ? '0.95' : '0.90'})`;
    element.style.transition = 'transform 0.1s ease';

    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 100);
  }, []);

  const addRippleEffect = useCallback((element: HTMLElement, x: number, y: number) => {
    const ripple = document.createElement('div');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (x - rect.left - size / 2) + 'px';
    ripple.style.top = (y - rect.top - size / 2) + 'px';
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.background = 'rgba(255, 255, 255, 0.6)';
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = 'ripple 0.6s linear';
    ripple.style.pointerEvents = 'none';

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  }, []);

  return {
    addTouchFeedback,
    addRippleEffect,
  };
};

// 虚拟键盘适配Hook
export const useVirtualKeyboard = () => {
  const { useState } = require('react');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDiff = windowHeight - viewportHeight;

      setKeyboardHeight(heightDiff);
      setIsKeyboardOpen(heightDiff > 150); // 键盘高度通常>150px
    };

    // 监听视口变化
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardOpen,
  };
};
