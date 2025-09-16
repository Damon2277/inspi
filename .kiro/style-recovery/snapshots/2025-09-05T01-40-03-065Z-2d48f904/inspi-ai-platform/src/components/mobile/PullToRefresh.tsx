'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number;
  maxPullDistance?: number;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  maxPullDistance = 120
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);

  // 检查是否可以下拉刷新
  const canPullToRefresh = useCallback(() => {
    if (disabled || isRefreshing) return false;
    
    // 检查页面是否在顶部
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return scrollTop === 0;
  }, [disabled, isRefreshing]);

  // 处理触摸开始
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!canPullToRefresh()) return;
    
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = startYRef.current;
    isPullingRef.current = false;
  }, [canPullToRefresh]);

  // 处理触摸移动
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!canPullToRefresh()) return;
    
    currentYRef.current = e.touches[0].clientY;
    const deltaY = currentYRef.current - startYRef.current;
    
    if (deltaY > 0) {
      // 向下拉动
      isPullingRef.current = true;
      
      // 阻止默认滚动行为
      e.preventDefault();
      
      // 计算拉动距离，使用阻尼效果
      const distance = Math.min(deltaY * 0.5, maxPullDistance);
      setPullDistance(distance);
      
      // 检查是否达到刷新阈值
      setCanRefresh(distance >= threshold);
    }
  }, [canPullToRefresh, threshold, maxPullDistance]);

  // 处理触摸结束
  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    
    isPullingRef.current = false;
    
    if (canRefresh && !isRefreshing) {
      // 触发刷新
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('刷新失败:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setCanRefresh(false);
      }
    } else {
      // 回弹动画
      setPullDistance(0);
      setCanRefresh(false);
    }
  }, [canRefresh, isRefreshing, onRefresh]);

  // 绑定事件监听器
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // 获取刷新指示器的状态文本
  const getStatusText = () => {
    if (isRefreshing) return '正在刷新...';
    if (canRefresh) return '松开刷新';
    return '下拉刷新';
  };

  // 获取刷新指示器的图标
  const getStatusIcon = () => {
    if (isRefreshing) {
      return (
        <svg className="w-5 h-5 animate-spin text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    }
    
    return (
      <svg 
        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${canRefresh ? 'rotate-180' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      {/* 下拉刷新指示器 */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center bg-white border-b border-gray-200 transition-all duration-200 ease-out"
        style={{
          height: `${Math.max(0, pullDistance)}px`,
          transform: `translateY(-${Math.max(0, pullDistance)}px)`,
          opacity: pullDistance > 0 ? 1 : 0
        }}
      >
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
      </div>

      {/* 内容区域 */}
      <div 
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;