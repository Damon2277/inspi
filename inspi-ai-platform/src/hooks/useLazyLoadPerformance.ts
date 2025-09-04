'use client';

import { useEffect, useRef, useState } from 'react';

interface LazyLoadMetrics {
  componentName: string;
  loadStartTime: number;
  loadEndTime?: number;
  loadDuration?: number;
  isLoading: boolean;
  error?: Error;
}

interface PerformanceData {
  totalComponents: number;
  loadedComponents: number;
  averageLoadTime: number;
  slowestComponent?: LazyLoadMetrics;
  fastestComponent?: LazyLoadMetrics;
  failedComponents: LazyLoadMetrics[];
}

/**
 * 懒加载性能监控Hook
 * 跟踪组件加载时间和性能指标
 */
export function useLazyLoadPerformance() {
  const [metrics, setMetrics] = useState<LazyLoadMetrics[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    totalComponents: 0,
    loadedComponents: 0,
    averageLoadTime: 0,
    failedComponents: [],
  });

  const metricsRef = useRef<Map<string, LazyLoadMetrics>>(new Map());

  // 开始跟踪组件加载
  const startTracking = (componentName: string) => {
    const metric: LazyLoadMetrics = {
      componentName,
      loadStartTime: performance.now(),
      isLoading: true,
    };

    metricsRef.current.set(componentName, metric);
    setMetrics(prev => [...prev.filter(m => m.componentName !== componentName), metric]);
  };

  // 完成组件加载跟踪
  const finishTracking = (componentName: string, error?: Error) => {
    const metric = metricsRef.current.get(componentName);
    if (!metric) return;

    const loadEndTime = performance.now();
    const loadDuration = loadEndTime - metric.loadStartTime;

    const updatedMetric: LazyLoadMetrics = {
      ...metric,
      loadEndTime,
      loadDuration,
      isLoading: false,
      error,
    };

    metricsRef.current.set(componentName, updatedMetric);
    setMetrics(prev => prev.map(m => 
      m.componentName === componentName ? updatedMetric : m
    ));
  };

  // 计算性能数据
  useEffect(() => {
    const allMetrics = Array.from(metricsRef.current.values());
    const loadedMetrics = allMetrics.filter(m => !m.isLoading && !m.error);
    const failedMetrics = allMetrics.filter(m => m.error);

    const loadTimes = loadedMetrics
      .map(m => m.loadDuration)
      .filter((time): time is number => time !== undefined);

    const averageLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length 
      : 0;

    const slowestComponent = loadedMetrics.reduce((slowest, current) => {
      if (!slowest || !current.loadDuration) return slowest;
      if (!slowest.loadDuration || current.loadDuration > slowest.loadDuration) {
        return current;
      }
      return slowest;
    }, undefined as LazyLoadMetrics | undefined);

    const fastestComponent = loadedMetrics.reduce((fastest, current) => {
      if (!fastest || !current.loadDuration) return fastest;
      if (!fastest.loadDuration || current.loadDuration < fastest.loadDuration) {
        return current;
      }
      return fastest;
    }, undefined as LazyLoadMetrics | undefined);

    setPerformanceData({
      totalComponents: allMetrics.length,
      loadedComponents: loadedMetrics.length,
      averageLoadTime,
      slowestComponent,
      fastestComponent,
      failedComponents: failedMetrics,
    });
  }, [metrics]);

  // 获取组件性能报告
  const getPerformanceReport = () => {
    const report = {
      summary: performanceData,
      details: metrics,
      recommendations: [] as string[],
    };

    // 生成性能建议
    if (performanceData.averageLoadTime > 1000) {
      report.recommendations.push('平均加载时间超过1秒，考虑进一步优化组件大小');
    }

    if (performanceData.failedComponents.length > 0) {
      report.recommendations.push(`有${performanceData.failedComponents.length}个组件加载失败，需要检查错误处理`);
    }

    if (performanceData.slowestComponent && performanceData.slowestComponent.loadDuration! > 2000) {
      report.recommendations.push(`组件"${performanceData.slowestComponent.componentName}"加载时间过长，需要优化`);
    }

    return report;
  };

  // 清除性能数据
  const clearMetrics = () => {
    metricsRef.current.clear();
    setMetrics([]);
    setPerformanceData({
      totalComponents: 0,
      loadedComponents: 0,
      averageLoadTime: 0,
      failedComponents: [],
    });
  };

  return {
    metrics,
    performanceData,
    startTracking,
    finishTracking,
    getPerformanceReport,
    clearMetrics,
  };
}

/**
 * 懒加载性能监控HOC
 */
export function withLazyLoadTracking<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  componentName: string
) {
  return function TrackedComponent(props: T) {
    const { startTracking, finishTracking } = useLazyLoadPerformance();

    useEffect(() => {
      startTracking(componentName);
      
      return () => {
        finishTracking(componentName);
      };
    }, []);

    return <WrappedComponent {...props} />;
  };
}

/**
 * 性能监控上下文
 */
export const LazyLoadPerformanceContext = React.createContext<{
  startTracking: (componentName: string) => void;
  finishTracking: (componentName: string, error?: Error) => void;
  getPerformanceReport: () => any;
} | null>(null);

export function LazyLoadPerformanceProvider({ children }: { children: React.ReactNode }) {
  const performance = useLazyLoadPerformance();

  return (
    <LazyLoadPerformanceContext.Provider value={performance}>
      {children}
    </LazyLoadPerformanceContext.Provider>
  );
}