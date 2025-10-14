/**
 * 性能监控系统
 * 监控应用性能指标并提供优化建议
 */

/**
 * 性能指标接口
 */
interface PerformanceMetrics {
  // 页面加载性能
  pageLoad: {
    domContentLoaded: number;
    loadComplete: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
  };

  // 资源加载性能
  resources: {
    totalSize: number;
    loadTime: number;
    cacheHitRate: number;
    failedRequests: number;
  };

  // 运行时性能
  runtime: {
    memoryUsage: number;
    cpuUsage: number;
    frameRate: number;
    longTasks: number;
  };

  // 用户体验指标
  userExperience: {
    timeToInteractive: number;
    totalBlockingTime: number;
    speedIndex: number;
  };
}

/**
 * 性能阈值配置
 */
interface PerformanceThresholds {
  pageLoad: {
    domContentLoaded: number;
    loadComplete: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
  };
  resources: {
    totalSize: number;
    loadTime: number;
    cacheHitRate: number;
  };
  runtime: {
    memoryUsage: number;
    frameRate: number;
  };
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private thresholds: PerformanceThresholds;
  private callbacks: Array<(metrics: PerformanceMetrics) => void> = [];

  constructor() {
    this.thresholds = {
      pageLoad: {
        domContentLoaded: 1500,
        loadComplete: 3000,
        firstContentfulPaint: 1800,
        largestContentfulPaint: 2500,
        firstInputDelay: 100,
        cumulativeLayoutShift: 0.1,
      },
      resources: {
        totalSize: 2 * 1024 * 1024, // 2MB
        loadTime: 3000,
        cacheHitRate: 0.8,
      },
      runtime: {
        memoryUsage: 50 * 1024 * 1024, // 50MB
        frameRate: 55,
      },
    };

    this.initializeMonitoring();
  }

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  /**
   * 初始化性能监控
   */
  private initializeMonitoring() {
    if (typeof window === 'undefined') return;

    // 监控导航时间
    this.monitorNavigationTiming();

    // 监控Paint时间
    this.monitorPaintTiming();

    // 监控Layout Shift
    this.monitorLayoutShift();

    // 监控Long Tasks
    this.monitorLongTasks();

    // 监控资源加载
    this.monitorResourceTiming();

    // 监控内存使用
    this.monitorMemoryUsage();

    // 监控帧率
    this.monitorFrameRate();
  }

  /**
   * 监控导航时间
   */
  private monitorNavigationTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];

      if (navigationEntries.length > 0) {
        const entry = navigationEntries[0];

        this.updateMetrics('pageLoad', {
          domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
          loadComplete: entry.loadEventEnd - entry.loadEventStart,
        });
      }
    }
  }

  /**
   * 监控Paint时间
   */
  private monitorPaintTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.updateMetrics('pageLoad', {
              firstContentfulPaint: entry.startTime,
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['paint'] });
        this.observers.set('paint', observer);
      } catch (error) {
        console.warn('Paint timing not supported:', error);
      }
    }
  }

  /**
   * 监控Largest Contentful Paint
   */
  private monitorLargestContentfulPaint() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];

        this.updateMetrics('pageLoad', {
          largestContentfulPaint: lastEntry.startTime,
        });
      });

      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', observer);
      } catch (error) {
        console.warn('LCP not supported:', error);
      }
    }
  }

  /**
   * 监控Layout Shift
   */
  private monitorLayoutShift() {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });

        this.updateMetrics('pageLoad', {
          cumulativeLayoutShift: clsValue,
        });
      });

      try {
        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', observer);
      } catch (error) {
        console.warn('Layout shift not supported:', error);
      }
    }
  }

  /**
   * 监控Long Tasks
   */
  private monitorLongTasks() {
    if ('PerformanceObserver' in window) {
      let longTaskCount = 0;

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        longTaskCount += entries.length;

        this.updateMetrics('runtime', {
          longTasks: longTaskCount,
        });
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', observer);
      } catch (error) {
        console.warn('Long task monitoring not supported:', error);
      }
    }
  }

  /**
   * 监控资源加载
   */
  private monitorResourceTiming() {
    if ('PerformanceObserver' in window) {
      let totalSize = 0;
      let totalLoadTime = 0;
      let resourceCount = 0;
      let cacheHits = 0;
      let failedRequests = 0;

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry: any) => {
          resourceCount++;
          totalLoadTime += entry.duration;

          if (entry.transferSize !== undefined) {
            totalSize += entry.transferSize;

            // 检查是否来自缓存
            if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
              cacheHits++;
            }
          }

          // 检查失败的请求
          if (entry.responseStatus >= 400) {
            failedRequests++;
          }
        });

        this.updateMetrics('resources', {
          totalSize,
          loadTime: totalLoadTime / resourceCount,
          cacheHitRate: cacheHits / resourceCount,
          failedRequests,
        });
      });

      try {
        observer.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', observer);
      } catch (error) {
        console.warn('Resource timing not supported:', error);
      }
    }
  }

  /**
   * 监控内存使用
   */
  private monitorMemoryUsage() {
    if ('memory' in performance) {
      const updateMemory = () => {
        const memory = (performance as any).memory;

        this.updateMetrics('runtime', {
          memoryUsage: memory.usedJSHeapSize,
        });
      };

      // 定期更新内存使用情况
      setInterval(updateMemory, 5000);
      updateMemory();
    }
  }

  /**
   * 监控帧率
   */
  private monitorFrameRate() {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFrameRate = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));

        this.updateMetrics('runtime', {
          frameRate: fps,
        });

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFrameRate);
    };

    requestAnimationFrame(measureFrameRate);
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(category: keyof PerformanceMetrics, data: any) {
    if (!this.metrics[category]) {
      this.metrics[category] = {} as any;
    }

    Object.assign(this.metrics[category], data);

    // 通知回调函数
    this.callbacks.forEach(callback => {
      callback(this.metrics as PerformanceMetrics);
    });

    // 检查性能阈值
    this.checkThresholds(category, data);
  }

  /**
   * 检查性能阈值
   */
  private checkThresholds(category: keyof PerformanceMetrics, data: any) {
    const categoryThresholds = this.thresholds[category as keyof PerformanceThresholds];
    if (!categoryThresholds) return;

    Object.keys(data).forEach(key => {
      const value = data[key];
      const threshold = (categoryThresholds as any)[key];

      if (threshold !== undefined && value > threshold) {
        this.reportPerformanceIssue(category, key, value, threshold);
      }
    });
  }

  /**
   * 报告性能问题
   */
  private reportPerformanceIssue(
    category: string,
    metric: string,
    value: number,
    threshold: number,
  ) {
    const issue = {
      category,
      metric,
      value,
      threshold,
      severity: this.calculateSeverity(value, threshold),
      timestamp: Date.now(),
      recommendations: this.getRecommendations(category, metric),
    };

    console.warn('Performance issue detected:', issue);

    // 发送到监控系统
    this.sendToMonitoringSystem(issue);
  }

  /**
   * 计算问题严重程度
   */
  private calculateSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' {
    const ratio = value / threshold;

    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  /**
   * 获取优化建议
   */
  private getRecommendations(category: string, metric: string): string[] {
    const recommendationMap: Record<string, Record<string, string[]>> = {
      pageLoad: {
        domContentLoaded: [
          '减少DOM元素数量',
          '优化CSS选择器',
          '延迟加载非关键资源',
        ],
        firstContentfulPaint: [
          '优化关键渲染路径',
          '减少阻塞渲染的资源',
          '使用资源预加载',
        ],
        largestContentfulPaint: [
          '优化图片加载',
          '使用CDN加速',
          '实现代码分割',
        ],
        cumulativeLayoutShift: [
          '为图片设置尺寸属性',
          '避免动态插入内容',
          '使用transform代替改变布局的属性',
        ],
      },
      resources: {
        totalSize: [
          '启用资源压缩',
          '优化图片格式',
          '移除未使用的代码',
        ],
        loadTime: [
          '使用CDN',
          '启用HTTP/2',
          '实现资源缓存',
        ],
      },
      runtime: {
        memoryUsage: [
          '检查内存泄漏',
          '优化数据结构',
          '及时清理事件监听器',
        ],
        frameRate: [
          '优化动画性能',
          '减少重绘和重排',
          '使用requestAnimationFrame',
        ],
      },
    };

    return recommendationMap[category]?.[metric] || ['联系开发团队进行性能优化'];
  }

  /**
   * 发送到监控系统
   */
  private sendToMonitoringSystem(issue: any) {
    // 这里可以集成第三方监控服务
    if (process.env.NODE_ENV === 'production') {
      // 发送到监控服务
      fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issue),
      }).catch(error => {
        console.error('Failed to send performance data:', error);
      });
    }
  }

  /**
   * 订阅性能指标更新
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.callbacks.push(callback);

    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * 生成性能报告
   */
  generateReport(): {
    metrics: Partial<PerformanceMetrics>;
    score: number;
    recommendations: string[];
  } {
    const score = this.calculatePerformanceScore();
    const recommendations = this.generateRecommendations();

    return {
      metrics: this.getMetrics(),
      score,
      recommendations,
    };
  }

  /**
   * 计算性能评分
   */
  private calculatePerformanceScore(): number {
    let score = 100;
    const metrics = this.metrics;

    // 根据各项指标计算扣分
    if (metrics.pageLoad?.firstContentfulPaint) {
      if (metrics.pageLoad.firstContentfulPaint > 3000) score -= 20;
      else if (metrics.pageLoad.firstContentfulPaint > 1800) score -= 10;
    }

    if (metrics.pageLoad?.largestContentfulPaint) {
      if (metrics.pageLoad.largestContentfulPaint > 4000) score -= 25;
      else if (metrics.pageLoad.largestContentfulPaint > 2500) score -= 15;
    }

    if (metrics.pageLoad?.cumulativeLayoutShift) {
      if (metrics.pageLoad.cumulativeLayoutShift > 0.25) score -= 20;
      else if (metrics.pageLoad.cumulativeLayoutShift > 0.1) score -= 10;
    }

    if (metrics.runtime?.frameRate) {
      if (metrics.runtime.frameRate < 30) score -= 30;
      else if (metrics.runtime.frameRate < 55) score -= 15;
    }

    return Math.max(0, score);
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.metrics;

    if (metrics.pageLoad?.firstContentfulPaint && metrics.pageLoad.firstContentfulPaint > 1800) {
      recommendations.push('优化首次内容绘制时间');
    }

    if (metrics.pageLoad?.largestContentfulPaint && metrics.pageLoad.largestContentfulPaint > 2500) {
      recommendations.push('优化最大内容绘制时间');
    }

    if (metrics.pageLoad?.cumulativeLayoutShift && metrics.pageLoad.cumulativeLayoutShift > 0.1) {
      recommendations.push('减少累积布局偏移');
    }

    if (metrics.runtime?.frameRate && metrics.runtime.frameRate < 55) {
      recommendations.push('提高页面帧率');
    }

    if (metrics.resources?.totalSize && metrics.resources.totalSize > 2 * 1024 * 1024) {
      recommendations.push('减少资源总大小');
    }

    return recommendations;
  }

  /**
   * 清理监控器
   */
  cleanup() {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
    this.callbacks = [];
  }
}

/**
 * React Hook for performance monitoring
 */
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = React.useState<Partial<PerformanceMetrics>>({});
  const [report, setReport] = React.useState<any>(null);

  React.useEffect(() => {
    const monitor = PerformanceMonitor.getInstance();

    const unsubscribe = monitor.subscribe((newMetrics) => {
      setMetrics(newMetrics);
    });

    // 生成初始报告
    setReport(monitor.generateReport());

    // 定期更新报告
    const reportInterval = setInterval(() => {
      setReport(monitor.generateReport());
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(reportInterval);
    };
  }, []);

  return { metrics, report };
}

// React import
import React from 'react';
