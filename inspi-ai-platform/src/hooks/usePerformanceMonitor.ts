import { useEffect } from 'react';

interface PerformanceMetrics {
  FCP?: number;
  LCP?: number;
  FID?: number;
  CLS?: number;
}

export const usePerformanceMonitor = () => {
  useEffect(() => {
    // 只在浏览器环境中运行
    if (typeof window === 'undefined') return;

    // 监控Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      const metrics: PerformanceMetrics = {};
      
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              metrics.FCP = entry.startTime;
            }
            break;
          case 'largest-contentful-paint':
            metrics.LCP = entry.startTime;
            break;
          case 'first-input':
            metrics.FID = (entry as any).processingStart - entry.startTime;
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              metrics.CLS = (metrics.CLS || 0) + (entry as any).value;
            }
            break;
        }
      }
      
      // 发送指标到监控服务
      if (Object.keys(metrics).length > 0) {
        console.log('Performance Metrics:', metrics);
        // 这里可以发送到实际的监控服务
        // sendToAnalytics(metrics);
      }
    });
    
    // 检查浏览器支持
    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (error) {
      console.warn('Performance Observer not fully supported:', error);
    }
    
    return () => observer.disconnect();
  }, []);
};