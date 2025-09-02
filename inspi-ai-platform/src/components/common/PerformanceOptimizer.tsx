/**
 * 性能优化组合组件
 */
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/lib/logging/logger';
import { globalMemoryMonitor, MemoryInfo } from '@/lib/performance/memory';
import { globalCodeSplittingManager } from '@/lib/performance/code-splitting';
import FirstPaintOptimizer from '@/lib/performance/first-paint';
import PerformanceMonitor from '@/lib/performance/metrics';

/**
 * 性能优化配置
 */
export interface PerformanceOptimizerConfig {
  // 内存监控
  memoryMonitoring?: {
    enabled: boolean;
    warningThreshold?: number;
    dangerThreshold?: number;
    interval?: number;
  };
  
  // 首屏优化
  firstPaintOptimization?: {
    enabled: boolean;
    inlineCSSThreshold?: number;
    preloadFonts?: boolean;
    deferNonCritical?: boolean;
  };
  
  // 代码分割
  codeSplitting?: {
    enabled: boolean;
    preloadCritical?: boolean;
    prefetchRoutes?: string[];
  };
  
  // 性能监控
  performanceMonitoring?: {
    enabled: boolean;
    reportInterval?: number;
    reportEndpoint?: string;
  };
  
  // 开发工具
  devTools?: {
    enabled: boolean;
    showMemoryInfo: boolean;
    showPerformanceInfo: boolean;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };
}

/**
 * 性能优化器属性
 */
interface PerformanceOptimizerProps {
  children: React.ReactNode;
  config?: PerformanceOptimizerConfig;
}

/**
 * 性能统计信息
 */
interface PerformanceStats {
  memory: MemoryInfo | null;
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  cacheHitRate: number;
}

/**
 * 性能优化器组件
 */
const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({
  children,
  config = {}
}) => {
  const {
    memoryMonitoring = { enabled: true },
    firstPaintOptimization = { enabled: true },
    codeSplitting = { enabled: true },
    performanceMonitoring = { enabled: true },
    devTools = { enabled: process.env.NODE_ENV === 'development', showMemoryInfo: true, showPerformanceInfo: true }
  } = config;

  const [stats, setStats] = useState<PerformanceStats>({
    memory: null,
    loadTime: 0,
    renderTime: 0,
    interactionTime: 0,
    cacheHitRate: 0
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);
  const firstPaintOptimizerRef = useRef<FirstPaintOptimizer | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // 初始化性能监控
  useEffect(() => {
    if (performanceMonitoring.enabled) {
      performanceMonitorRef.current = new PerformanceMonitor({
        reportInterval: performanceMonitoring.reportInterval,
        reportEndpoint: performanceMonitoring.reportEndpoint
      });
      performanceMonitorRef.current.start();
    }

    return () => {
      if (performanceMonitorRef.current) {
        performanceMonitorRef.current.stop();
      }
    };
  }, [performanceMonitoring]);

  // 初始化首屏优化
  useEffect(() => {
    if (firstPaintOptimization.enabled) {
      firstPaintOptimizerRef.current = new FirstPaintOptimizer({
        inlineCSSThreshold: firstPaintOptimization.inlineCSSThreshold,
        preloadFonts: firstPaintOptimization.preloadFonts,
        deferNonCritical: firstPaintOptimization.deferNonCritical
      });
      firstPaintOptimizerRef.current.optimize();
    }
  }, [firstPaintOptimization]);

  // 初始化内存监控
  useEffect(() => {
    if (memoryMonitoring.enabled) {
      globalMemoryMonitor.start();
      
      const memoryConfig = {
        interval: memoryMonitoring.interval,
        warningThreshold: memoryMonitoring.warningThreshold,
        dangerThreshold: memoryMonitoring.dangerThreshold,
        onWarning: (info: MemoryInfo) => {
          logger.warn('Memory usage warning', { usagePercentage: info.usagePercentage });
          setStats(prev => ({ ...prev, memory: info }));
        },
        onDanger: (info: MemoryInfo) => {
          logger.error('Memory usage critical', { usagePercentage: info.usagePercentage });
          setStats(prev => ({ ...prev, memory: info }));
          // 触发自动优化
          optimizePerformance();
        }
      };
    }

    return () => {
      if (memoryMonitoring.enabled) {
        globalMemoryMonitor.stop();
      }
    };
  }, [memoryMonitoring]);

  // 初始化代码分割
  useEffect(() => {
    if (codeSplitting.enabled) {
      if (codeSplitting.preloadCritical) {
        globalCodeSplittingManager.preloadCriticalChunks();
      }
      
      if (codeSplitting.prefetchRoutes) {
        codeSplitting.prefetchRoutes.forEach(route => {
          globalCodeSplittingManager.prefetchRoute(route);
        });
      }
    }
  }, [codeSplitting]);

  // 性能统计更新
  const updateStats = useCallback(() => {
    const currentTime = Date.now();
    const loadTime = currentTime - startTimeRef.current;
    const memory = globalMemoryMonitor.getCurrentMemoryInfo();
    
    // 获取性能指标
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const renderTime = navigation.loadEventEnd - navigation.loadEventStart;
      const interactionTime = navigation.domInteractive - navigation.navigationStart;
      
      setStats(prev => ({
        ...prev,
        memory,
        loadTime,
        renderTime,
        interactionTime
      }));
    }
  }, []);

  // 定期更新统计信息
  useEffect(() => {
    const interval = setInterval(updateStats, 5000); // 每5秒更新一次
    return () => clearInterval(interval);
  }, [updateStats]);

  // 自动性能优化
  const optimizePerformance = useCallback(async () => {
    if (isOptimizing) return;
    
    setIsOptimizing(true);
    logger.info('Starting automatic performance optimization');

    try {
      // 清理内存
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }

      // 清理缓存
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name.includes('old') || name.includes('expired')
        );
        
        await Promise.all(
          oldCaches.map(cacheName => caches.delete(cacheName))
        );
      }

      // 预加载关键资源
      if (firstPaintOptimizerRef.current) {
        firstPaintOptimizerRef.current.preloadCriticalResources();
      }

      // 优化代码分割
      globalCodeSplittingManager.optimizeChunkLoading();

      logger.info('Performance optimization completed');
    } catch (error) {
      logger.error('Performance optimization failed', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing]);

  // 手动触发优化
  const handleOptimize = useCallback(() => {
    optimizePerformance();
  }, [optimizePerformance]);

  // 开发工具组件
  const DevTools = () => {
    if (!devTools.enabled || process.env.NODE_ENV !== 'development') {
      return null;
    }

    const position = devTools.position || 'bottom-right';
    const positionStyles = {
      'top-left': { top: '10px', left: '10px' },
      'top-right': { top: '10px', right: '10px' },
      'bottom-left': { bottom: '10px', left: '10px' },
      'bottom-right': { bottom: '10px', right: '10px' }
    };

    return (
      <div
        style={{
          position: 'fixed',
          ...positionStyles[position],
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 9999,
          minWidth: '200px'
        }}
      >
        <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
          Performance Monitor
        </div>
        
        {devTools.showMemoryInfo && stats.memory && (
          <div style={{ marginBottom: '5px' }}>
            <div>Memory: {Math.round(stats.memory.usagePercentage)}%</div>
            <div>Used: {Math.round(stats.memory.usedJSHeapSize / 1024 / 1024)}MB</div>
          </div>
        )}
        
        {devTools.showPerformanceInfo && (
          <div style={{ marginBottom: '5px' }}>
            <div>Load: {stats.loadTime}ms</div>
            <div>Render: {stats.renderTime}ms</div>
            <div>Interactive: {stats.interactionTime}ms</div>
          </div>
        )}
        
        <button
          onClick={handleOptimize}
          disabled={isOptimizing}
          style={{
            backgroundColor: isOptimizing ? '#666' : '#007bff',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: isOptimizing ? 'not-allowed' : 'pointer',
            fontSize: '11px'
          }}
        >
          {isOptimizing ? 'Optimizing...' : 'Optimize'}
        </button>
      </div>
    );
  };

  return (
    <>
      {children}
      <DevTools />
    </>
  );
};

/**
 * 性能优化Hook
 */
export function usePerformanceOptimizer(config: PerformanceOptimizerConfig = {}) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [stats, setStats] = useState<PerformanceStats>({
    memory: null,
    loadTime: 0,
    renderTime: 0,
    interactionTime: 0,
    cacheHitRate: 0
  });

  const optimize = useCallback(async () => {
    if (isOptimizing) return;
    
    setIsOptimizing(true);
    
    try {
      // 执行优化逻辑
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
      
      // 更新统计信息
      const memory = globalMemoryMonitor.getCurrentMemoryInfo();
      setStats(prev => ({ ...prev, memory }));
      
    } catch (error) {
      logger.error('Performance optimization failed', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing]);

  const getRecommendations = useCallback(() => {
    const recommendations: string[] = [];
    
    if (stats.memory && stats.memory.usagePercentage > 80) {
      recommendations.push('Consider reducing memory usage');
    }
    
    if (stats.loadTime > 3000) {
      recommendations.push('Optimize loading performance');
    }
    
    if (stats.renderTime > 1000) {
      recommendations.push('Optimize rendering performance');
    }
    
    return recommendations;
  }, [stats]);

  return {
    stats,
    isOptimizing,
    optimize,
    getRecommendations
  };
}

/**
 * 性能监控Provider
 */
export const PerformanceProvider: React.FC<{
  children: React.ReactNode;
  config?: PerformanceOptimizerConfig;
}> = ({ children, config }) => {
  return (
    <PerformanceOptimizer config={config}>
      {children}
    </PerformanceOptimizer>
  );
};

export default PerformanceOptimizer;