/**
 * 移动端性能监控工具
 * 监控移动端性能指标和用户体验
 */

// 性能指标类型定义
interface PerformanceMetrics {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

interface MobileMetrics {
  touchResponseTime: number;
  scrollPerformance: number;
  memoryUsage: number;
  batteryLevel?: number;
  networkType: string;
  devicePixelRatio: number;
}

interface UserExperienceMetrics {
  pageLoadTime: number;
  interactionTime: number;
  errorCount: number;
  crashCount: number;
  sessionDuration: number;
}

// 性能监控类
export class MobilePerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private mobileMetrics: Partial<MobileMetrics> = {};
  private uxMetrics: Partial<UserExperienceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private startTime: number = Date.now();

  constructor() {
    this.initializeMonitoring();
  }

  /**
   * 初始化性能监控
   */
  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;

    // 监控Web Vitals
    this.observeWebVitals();
    
    // 监控移动端特定指标
    this.observeMobileMetrics();
    
    // 监控用户体验指标
    this.observeUserExperience();
    
    // 监控内存使用
    this.observeMemoryUsage();
  }

  /**
   * 监控Web Vitals指标
   */
  private observeWebVitals(): void {
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.metrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP monitoring not supported:', error);
      }

      // FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.metrics.fid = entry.processingStart - entry.startTime;
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID monitoring not supported:', error);
      }

      // CLS (Cumulative Layout Shift)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.metrics.cls = clsValue;
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('CLS monitoring not supported:', error);
      }
    }

    // FCP (First Contentful Paint)
    if (performance.getEntriesByType) {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.metrics.fcp = fcpEntry.startTime;
      }
    }

    // TTFB (Time to First Byte)
    if (performance.timing) {
      this.metrics.ttfb = performance.timing.responseStart - performance.timing.requestStart;
    }
  }

  /**
   * 监控移动端特定指标
   */
  private observeMobileMetrics(): void {
    // 设备像素比
    this.mobileMetrics.devicePixelRatio = window.devicePixelRatio || 1;

    // 网络类型
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      this.mobileMetrics.networkType = connection.effectiveType || connection.type || 'unknown';
    }

    // 电池状态（如果支持）
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.mobileMetrics.batteryLevel = battery.level * 100;
      }).catch(() => {
        // 电池API不支持
      });
    }

    // 触摸响应时间监控
    this.monitorTouchResponse();

    // 滚动性能监控
    this.monitorScrollPerformance();
  }

  /**
   * 监控触摸响应时间
   */
  private monitorTouchResponse(): void {
    let touchStartTime = 0;
    const touchResponseTimes: number[] = [];

    document.addEventListener('touchstart', () => {
      touchStartTime = performance.now();
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (touchStartTime > 0) {
        const responseTime = performance.now() - touchStartTime;
        touchResponseTimes.push(responseTime);
        
        // 保持最近100次的记录
        if (touchResponseTimes.length > 100) {
          touchResponseTimes.shift();
        }
        
        // 计算平均响应时间
        this.mobileMetrics.touchResponseTime = 
          touchResponseTimes.reduce((sum, time) => sum + time, 0) / touchResponseTimes.length;
      }
    }, { passive: true });
  }

  /**
   * 监控滚动性能
   */
  private monitorScrollPerformance(): void {
    let scrollStartTime = 0;
    let frameCount = 0;
    let totalFrameTime = 0;

    const measureScrollPerformance = () => {
      if (scrollStartTime > 0) {
        frameCount++;
        const currentTime = performance.now();
        totalFrameTime += currentTime - scrollStartTime;
        
        // 计算平均帧时间
        const avgFrameTime = totalFrameTime / frameCount;
        this.mobileMetrics.scrollPerformance = 1000 / avgFrameTime; // FPS
        
        scrollStartTime = currentTime;
      }
    };

    document.addEventListener('scroll', () => {
      if (scrollStartTime === 0) {
        scrollStartTime = performance.now();
        frameCount = 0;
        totalFrameTime = 0;
      }
      requestAnimationFrame(measureScrollPerformance);
    }, { passive: true });
  }

  /**
   * 监控用户体验指标
   */
  private observeUserExperience(): void {
    // 页面加载时间
    window.addEventListener('load', () => {
      this.uxMetrics.pageLoadTime = Date.now() - this.startTime;
    });

    // 交互时间监控
    let interactionStartTime = 0;
    const interactionTimes: number[] = [];

    ['click', 'touchstart', 'keydown'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        interactionStartTime = performance.now();
      }, { passive: true });
    });

    ['click', 'touchend', 'keyup'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        if (interactionStartTime > 0) {
          const interactionTime = performance.now() - interactionStartTime;
          interactionTimes.push(interactionTime);
          
          if (interactionTimes.length > 50) {
            interactionTimes.shift();
          }
          
          this.uxMetrics.interactionTime = 
            interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length;
        }
      }, { passive: true });
    });

    // 错误计数
    let errorCount = 0;
    window.addEventListener('error', () => {
      errorCount++;
      this.uxMetrics.errorCount = errorCount;
    });

    // 会话时长
    setInterval(() => {
      this.uxMetrics.sessionDuration = Date.now() - this.startTime;
    }, 30000); // 每30秒更新一次
  }

  /**
   * 监控内存使用
   */
  private observeMemoryUsage(): void {
    if ('memory' in performance) {
      const updateMemoryUsage = () => {
        const memory = (performance as any).memory;
        this.mobileMetrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      };

      updateMemoryUsage();
      setInterval(updateMemoryUsage, 10000); // 每10秒更新一次
    }
  }

  /**
   * 获取当前性能指标
   */
  public getMetrics(): {
    webVitals: Partial<PerformanceMetrics>;
    mobile: Partial<MobileMetrics>;
    userExperience: Partial<UserExperienceMetrics>;
  } {
    return {
      webVitals: { ...this.metrics },
      mobile: { ...this.mobileMetrics },
      userExperience: { ...this.uxMetrics }
    };
  }

  /**
   * 获取性能评分
   */
  public getPerformanceScore(): {
    overall: number;
    webVitals: number;
    mobile: number;
    userExperience: number;
  } {
    const webVitalsScore = this.calculateWebVitalsScore();
    const mobileScore = this.calculateMobileScore();
    const uxScore = this.calculateUXScore();
    
    const overall = (webVitalsScore + mobileScore + uxScore) / 3;

    return {
      overall: Math.round(overall),
      webVitals: Math.round(webVitalsScore),
      mobile: Math.round(mobileScore),
      userExperience: Math.round(uxScore)
    };
  }

  /**
   * 计算Web Vitals评分
   */
  private calculateWebVitalsScore(): number {
    let score = 100;

    // LCP评分 (目标: <2.5s)
    if (this.metrics.lcp) {
      if (this.metrics.lcp > 4000) score -= 30;
      else if (this.metrics.lcp > 2500) score -= 15;
    }

    // FID评分 (目标: <100ms)
    if (this.metrics.fid) {
      if (this.metrics.fid > 300) score -= 25;
      else if (this.metrics.fid > 100) score -= 10;
    }

    // CLS评分 (目标: <0.1)
    if (this.metrics.cls) {
      if (this.metrics.cls > 0.25) score -= 25;
      else if (this.metrics.cls > 0.1) score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * 计算移动端评分
   */
  private calculateMobileScore(): number {
    let score = 100;

    // 触摸响应时间评分 (目标: <100ms)
    if (this.mobileMetrics.touchResponseTime) {
      if (this.mobileMetrics.touchResponseTime > 200) score -= 30;
      else if (this.mobileMetrics.touchResponseTime > 100) score -= 15;
    }

    // 滚动性能评分 (目标: >30fps)
    if (this.mobileMetrics.scrollPerformance) {
      if (this.mobileMetrics.scrollPerformance < 20) score -= 25;
      else if (this.mobileMetrics.scrollPerformance < 30) score -= 10;
    }

    // 内存使用评分 (目标: <100MB)
    if (this.mobileMetrics.memoryUsage) {
      if (this.mobileMetrics.memoryUsage > 200) score -= 20;
      else if (this.mobileMetrics.memoryUsage > 100) score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * 计算用户体验评分
   */
  private calculateUXScore(): number {
    let score = 100;

    // 页面加载时间评分 (目标: <3s)
    if (this.uxMetrics.pageLoadTime) {
      if (this.uxMetrics.pageLoadTime > 5000) score -= 25;
      else if (this.uxMetrics.pageLoadTime > 3000) score -= 10;
    }

    // 交互时间评分 (目标: <50ms)
    if (this.uxMetrics.interactionTime) {
      if (this.uxMetrics.interactionTime > 100) score -= 20;
      else if (this.uxMetrics.interactionTime > 50) score -= 10;
    }

    // 错误率评分
    if (this.uxMetrics.errorCount && this.uxMetrics.sessionDuration) {
      const errorRate = this.uxMetrics.errorCount / (this.uxMetrics.sessionDuration / 60000); // 每分钟错误数
      if (errorRate > 1) score -= 30;
      else if (errorRate > 0.5) score -= 15;
    }

    return Math.max(0, score);
  }

  /**
   * 生成性能报告
   */
  public generateReport(): string {
    const metrics = this.getMetrics();
    const scores = this.getPerformanceScore();

    const report = `
移动端性能报告
================

总体评分: ${scores.overall}/100

Web Vitals (${scores.webVitals}/100):
- LCP: ${metrics.webVitals.lcp ? `${metrics.webVitals.lcp.toFixed(0)}ms` : 'N/A'}
- FID: ${metrics.webVitals.fid ? `${metrics.webVitals.fid.toFixed(0)}ms` : 'N/A'}
- CLS: ${metrics.webVitals.cls ? metrics.webVitals.cls.toFixed(3) : 'N/A'}
- FCP: ${metrics.webVitals.fcp ? `${metrics.webVitals.fcp.toFixed(0)}ms` : 'N/A'}
- TTFB: ${metrics.webVitals.ttfb ? `${metrics.webVitals.ttfb.toFixed(0)}ms` : 'N/A'}

移动端指标 (${scores.mobile}/100):
- 触摸响应: ${metrics.mobile.touchResponseTime ? `${metrics.mobile.touchResponseTime.toFixed(0)}ms` : 'N/A'}
- 滚动性能: ${metrics.mobile.scrollPerformance ? `${metrics.mobile.scrollPerformance.toFixed(0)}fps` : 'N/A'}
- 内存使用: ${metrics.mobile.memoryUsage ? `${metrics.mobile.memoryUsage.toFixed(1)}MB` : 'N/A'}
- 网络类型: ${metrics.mobile.networkType || 'N/A'}
- 设备像素比: ${metrics.mobile.devicePixelRatio || 'N/A'}
- 电池电量: ${metrics.mobile.batteryLevel ? `${metrics.mobile.batteryLevel.toFixed(0)}%` : 'N/A'}

用户体验 (${scores.userExperience}/100):
- 页面加载: ${metrics.userExperience.pageLoadTime ? `${metrics.userExperience.pageLoadTime}ms` : 'N/A'}
- 交互时间: ${metrics.userExperience.interactionTime ? `${metrics.userExperience.interactionTime.toFixed(0)}ms` : 'N/A'}
- 错误次数: ${metrics.userExperience.errorCount || 0}
- 会话时长: ${metrics.userExperience.sessionDuration ? `${(metrics.userExperience.sessionDuration / 1000).toFixed(0)}s` : 'N/A'}

建议:
${this.generateRecommendations(scores)}
    `.trim();

    return report;
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(scores: ReturnType<typeof this.getPerformanceScore>): string {
    const recommendations: string[] = [];

    if (scores.webVitals < 80) {
      recommendations.push('- 优化Web Vitals指标，考虑代码分割和资源预加载');
    }

    if (scores.mobile < 80) {
      recommendations.push('- 优化移动端性能，减少触摸延迟和提升滚动流畅度');
    }

    if (scores.userExperience < 80) {
      recommendations.push('- 改善用户体验，减少页面加载时间和交互延迟');
    }

    if (this.mobileMetrics.memoryUsage && this.mobileMetrics.memoryUsage > 100) {
      recommendations.push('- 优化内存使用，考虑减少DOM节点和清理未使用的资源');
    }

    if (this.metrics.lcp && this.metrics.lcp > 2500) {
      recommendations.push('- 优化最大内容绘制时间，考虑图片优化和关键资源优先加载');
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- 性能表现良好，继续保持！';
  }

  /**
   * 清理监控器
   */
  public dispose(): void {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];
  }
}

// 创建全局性能监控实例
export const mobilePerformanceMonitor = new MobilePerformanceMonitor();

// 导出性能监控Hook
export const useMobilePerformance = () => {
  return {
    getMetrics: () => mobilePerformanceMonitor.getMetrics(),
    getScore: () => mobilePerformanceMonitor.getPerformanceScore(),
    generateReport: () => mobilePerformanceMonitor.generateReport()
  };
};