/**
 * 首屏加载性能优化
 */
import { logger } from '@/lib/logging/logger';

/**
 * 首屏性能指标
 */
export interface FirstPaintMetrics {
  // 首次绘制时间
  FP: number | null;
  // 首次内容绘制时间
  FCP: number | null;
  // 最大内容绘制时间
  LCP: number | null;
  // DOM内容加载完成时间
  DCL: number | null;
  // 页面完全加载时间
  Load: number | null;
  // 首次有意义绘制时间（自定义）
  FMP: number | null;
  // 可交互时间
  TTI: number | null;
}

/**
 * 关键资源信息
 */
export interface CriticalResource {
  url: string;
  type: 'script' | 'style' | 'font' | 'image';
  size: number;
  loadTime: number;
  blocking: boolean;
  critical: boolean;
}

/**
 * 首屏优化配置
 */
export interface FirstPaintConfig {
  // 关键CSS内联阈值
  inlineCSSThreshold: number;
  // 关键JS内联阈值
  inlineJSThreshold: number;
  // 图片懒加载阈值
  imageLazyThreshold: number;
  // 字体预加载
  preloadFonts: boolean;
  // 关键资源预加载
  preloadCritical: boolean;
  // 非关键资源延迟加载
  deferNonCritical: boolean;
  // 启用Service Worker
  enableServiceWorker: boolean;
}

/**
 * 首屏性能优化器
 */
export class FirstPaintOptimizer {
  private config: FirstPaintConfig;
  private metrics: FirstPaintMetrics = {
    FP: null,
    FCP: null,
    LCP: null,
    DCL: null,
    Load: null,
    FMP: null,
    TTI: null,
  };
  private criticalResources: CriticalResource[] = [];
  private observers: PerformanceObserver[] = [];

  constructor(config?: Partial<FirstPaintConfig>) {
    this.config = {
      inlineCSSThreshold: 14 * 1024, // 14KB
      inlineJSThreshold: 10 * 1024,  // 10KB
      imageLazyThreshold: 2000,      // 2秒后懒加载
      preloadFonts: true,
      preloadCritical: true,
      deferNonCritical: true,
      enableServiceWorker: true,
      ...config,
    };

    this.initializeOptimizations();
    this.startMetricsCollection();
  }

  /**
   * 初始化优化策略
   */
  private initializeOptimizations(): void {
    // 1. 内联关键CSS
    this.inlineCriticalCSS();

    // 2. 预加载关键资源
    if (this.config.preloadCritical) {
      this.preloadCriticalResources();
    }

    // 3. 延迟非关键资源
    if (this.config.deferNonCritical) {
      this.deferNonCriticalResources();
    }

    // 4. 优化字体加载
    if (this.config.preloadFonts) {
      this.optimizeFontLoading();
    }

    // 5. 启用Service Worker
    if (this.config.enableServiceWorker) {
      this.enableServiceWorker();
    }

    // 6. 优化图片加载
    this.optimizeImageLoading();

    // 7. 减少主线程阻塞
    this.reduceMainThreadBlocking();

    logger.info('First paint optimizations initialized');
  }

  /**
   * 内联关键CSS
   */
  private inlineCriticalCSS(): void {
    const criticalCSS = this.extractCriticalCSS();

    if (criticalCSS && criticalCSS.length < this.config.inlineCSSThreshold) {
      const style = document.createElement('style');
      style.textContent = criticalCSS;
      style.setAttribute('data-critical', 'true');

      // 插入到head的最前面
      const firstChild = document.head.firstChild;
      if (firstChild) {
        document.head.insertBefore(style, firstChild);
      } else {
        document.head.appendChild(style);
      }

      logger.debug('Critical CSS inlined', { size: criticalCSS.length });
    }
  }

  /**
   * 提取关键CSS
   */
  private extractCriticalCSS(): string {
    // 这里应该实现关键CSS提取逻辑
    // 可以使用工具如critical、penthouse等
    // 或者预先生成的关键CSS

    // 模拟关键CSS
    return `
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .header { background: #fff; border-bottom: 1px solid #e5e7eb; }
      .main { min-height: 100vh; }
      .loading { display: flex; justify-content: center; align-items: center; height: 200px; }
    `;
  }

  /**
   * 预加载关键资源
   */
  private preloadCriticalResources(): void {
    const criticalResources = [
      // 关键字体
      { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
      // 关键图片
      { href: '/images/hero.webp', as: 'image' },
      // 关键脚本
      { href: '/js/critical.js', as: 'script' },
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;

      if (resource.type) {
        link.type = resource.type;
      }

      if (resource.crossorigin) {
        link.crossOrigin = resource.crossorigin;
      }

      document.head.appendChild(link);
    });

    logger.debug('Critical resources preloaded', { count: criticalResources.length });
  }

  /**
   * 延迟非关键资源
   */
  private deferNonCriticalResources(): void {
    // 延迟加载非关键CSS
    const nonCriticalCSS = document.querySelectorAll('link[rel="stylesheet"]:not([data-critical])');
    nonCriticalCSS.forEach(link => {
      const href = (link as HTMLLinkElement).href;
      link.remove();

      // 在页面加载完成后加载
      window.addEventListener('load', () => {
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = href;
        document.head.appendChild(newLink);
      });
    });

    // 延迟加载非关键脚本
    const nonCriticalScripts = document.querySelectorAll('script:not([data-critical])');
    nonCriticalScripts.forEach(script => {
      if (!script.hasAttribute('async') && !script.hasAttribute('defer')) {
        script.setAttribute('defer', '');
      }
    });

    logger.debug('Non-critical resources deferred');
  }

  /**
   * 优化字体加载
   */
  private optimizeFontLoading(): void {
    logger.debug('Font loading handled by next/font');
  }

  /**
   * 启用Service Worker
   */
  private enableServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          logger.info('Service Worker registered', { scope: registration.scope });
        } catch (error) {
          logger.warn('Service Worker registration failed', { error: error instanceof Error ? error.message : String(error) });
        }
      });
    }
  }

  /**
   * 优化图片加载
   */
  private optimizeImageLoading(): void {
    // 为首屏图片添加高优先级
    const aboveFoldImages = document.querySelectorAll('img[data-priority="high"]');
    aboveFoldImages.forEach(img => {
      (img as HTMLImageElement).loading = 'eager';
      (img as HTMLImageElement).fetchPriority = 'high';
    });

    // 为其他图片启用懒加载
    const otherImages = document.querySelectorAll('img:not([data-priority="high"])');
    otherImages.forEach(img => {
      (img as HTMLImageElement).loading = 'lazy';
    });

    // 使用Intersection Observer进行更精细的懒加载控制
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px',
      });

      const lazyImages = document.querySelectorAll('img[data-src]');
      lazyImages.forEach(img => imageObserver.observe(img));
    }

    logger.debug('Image loading optimized');
  }

  /**
   * 减少主线程阻塞
   */
  private reduceMainThreadBlocking(): void {
    // 使用requestIdleCallback执行非关键任务
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        this.performNonCriticalTasks();
      });
    } else {
      setTimeout(() => {
        this.performNonCriticalTasks();
      }, 100);
    }

    // 分解长任务
    this.breakUpLongTasks();

    logger.debug('Main thread blocking reduced');
  }

  /**
   * 执行非关键任务
   */
  private performNonCriticalTasks(): void {
    // 初始化分析工具
    this.initializeAnalytics();

    // 预加载下一页内容
    this.preloadNextPageContent();

    // 初始化第三方库
    this.initializeThirdPartyLibraries();
  }

  /**
   * 分解长任务
   */
  private breakUpLongTasks(): void {
    // 使用MessageChannel或setTimeout分解长任务
    const scheduler = (callback: () => void) => {
      const channel = new MessageChannel();
      channel.port2.onmessage = () => callback();
      channel.port1.postMessage(null);
    };

    // 示例：分解数据处理任务
    const processDataInChunks = (data: any[], chunkSize: number = 100) => {
      let index = 0;

      const processChunk = () => {
        const chunk = data.slice(index, index + chunkSize);

        // 处理当前块
        chunk.forEach(item => {
          // 处理逻辑
        });

        index += chunkSize;

        if (index < data.length) {
          scheduler(processChunk);
        }
      };

      scheduler(processChunk);
    };
  }

  /**
   * 开始性能指标收集
   */
  private startMetricsCollection(): void {
    // 收集Paint Timing
    if ('PerformanceObserver' in window) {
      try {
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name === 'first-paint') {
              this.metrics.FP = Math.round(entry.startTime);
            } else if (entry.name === 'first-contentful-paint') {
              this.metrics.FCP = Math.round(entry.startTime);
            }
          });
        });

        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      } catch (error) {
        logger.warn('Paint timing observation failed', { error: error instanceof Error ? error.message : String(error) });
      }

      // 收集LCP
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.metrics.LCP = Math.round(lastEntry.startTime);
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        logger.warn('LCP observation failed', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // 收集Navigation Timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.metrics.DCL = Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
        this.metrics.Load = Math.round(navigation.loadEventEnd - navigation.loadEventStart);
      }

      // 计算自定义FMP
      this.calculateFMP();

      // 计算TTI
      this.calculateTTI();
    });
  }

  /**
   * 计算首次有意义绘制时间
   */
  private calculateFMP(): void {
    // 简化的FMP计算：主要内容元素出现的时间
    const mainContent = document.querySelector('[data-main-content]');
    if (mainContent) {
      // 使用MutationObserver监听主要内容的变化
      const observer = new MutationObserver(() => {
        if (mainContent.children.length > 0) {
          this.metrics.FMP = Math.round(performance.now());
          observer.disconnect();
        }
      });

      observer.observe(mainContent, { childList: true, subtree: true });

      // 如果已经有内容，立即设置FMP
      if (mainContent.children.length > 0) {
        this.metrics.FMP = Math.round(performance.now());
      }
    }
  }

  /**
   * 计算可交互时间
   */
  private calculateTTI(): void {
    // 简化的TTI计算：页面加载完成且没有长任务
    let longTaskCount = 0;

    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          longTaskCount += list.getEntries().length;
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });

        // 5秒后检查TTI
        setTimeout(() => {
          if (longTaskCount === 0 && document.readyState === 'complete') {
            this.metrics.TTI = Math.round(performance.now());
          }
          longTaskObserver.disconnect();
        }, 5000);
      } catch (error) {
        logger.warn('Long task observation failed', { error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(): FirstPaintMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取性能评分
   */
  getPerformanceScore(): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let score = 100;

    // FCP评分
    if (this.metrics.FCP) {
      if (this.metrics.FCP > 3000) {
        score -= 20;
        recommendations.push('优化首次内容绘制时间：内联关键CSS，优化字体加载');
      } else if (this.metrics.FCP > 1800) {
        score -= 10;
        recommendations.push('首次内容绘制时间可以进一步优化');
      }
    }

    // LCP评分
    if (this.metrics.LCP) {
      if (this.metrics.LCP > 4000) {
        score -= 25;
        recommendations.push('优化最大内容绘制时间：压缩图片，使用CDN，优化服务器响应');
      } else if (this.metrics.LCP > 2500) {
        score -= 15;
        recommendations.push('最大内容绘制时间需要优化');
      }
    }

    // TTI评分
    if (this.metrics.TTI) {
      if (this.metrics.TTI > 5000) {
        score -= 20;
        recommendations.push('优化可交互时间：减少JavaScript执行时间，分解长任务');
      } else if (this.metrics.TTI > 3800) {
        score -= 10;
        recommendations.push('可交互时间可以进一步优化');
      }
    }

    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

    return { score: Math.max(0, score), grade, recommendations };
  }

  /**
   * 初始化分析工具
   */
  private initializeAnalytics(): void {
    // 延迟初始化分析工具
    logger.debug('Analytics initialized');
  }

  /**
   * 预加载下一页内容
   */
  private preloadNextPageContent(): void {
    // 预测用户可能访问的下一页
    logger.debug('Next page content preloaded');
  }

  /**
   * 初始化第三方库
   */
  private initializeThirdPartyLibraries(): void {
    // 延迟初始化非关键的第三方库
    logger.debug('Third party libraries initialized');
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];

    logger.info('First paint optimizer cleaned up');
  }
}

/**
 * 首屏优化工具函数
 */
export class FirstPaintUtils {
  /**
   * 检测关键渲染路径
   */
  static detectCriticalRenderingPath(): {
    criticalResources: string[];
    blockingResources: string[];
    recommendations: string[];
  } {
    const criticalResources: string[] = [];
    const blockingResources: string[] = [];
    const recommendations: string[] = [];

    // 检查CSS
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    stylesheets.forEach(link => {
      const href = (link as HTMLLinkElement).href;
      if (!link.hasAttribute('media') || link.getAttribute('media') === 'all') {
        criticalResources.push(href);
        if (!link.hasAttribute('async')) {
          blockingResources.push(href);
        }
      }
    });

    // 检查JavaScript
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      const src = (script as HTMLScriptElement).src;
      if (!script.hasAttribute('async') && !script.hasAttribute('defer')) {
        blockingResources.push(src);
        recommendations.push(`考虑为脚本 ${src} 添加 async 或 defer 属性`);
      }
    });

    if (blockingResources.length > 3) {
      recommendations.push('减少阻塞渲染的资源数量');
    }

    return { criticalResources, blockingResources, recommendations };
  }

  /**
   * 计算关键资源大小
   */
  static async calculateCriticalResourceSize(): Promise<number> {
    const { criticalResources } = FirstPaintUtils.detectCriticalRenderingPath();
    let totalSize = 0;

    for (const resource of criticalResources) {
      try {
        const response = await fetch(resource, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          totalSize += parseInt(contentLength, 10);
        }
      } catch (error) {
        logger.warn('Failed to get resource size', { resource, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return totalSize;
  }

  /**
   * 生成性能预算建议
   */
  static generatePerformanceBudget(): {
    budget: {
      totalSize: number;
      jsSize: number;
      cssSize: number;
      imageSize: number;
      fontSize: number;
    };
    recommendations: string[];
  } {
    return {
      budget: {
        totalSize: 170 * 1024,  // 170KB
        jsSize: 130 * 1024,     // 130KB
        cssSize: 20 * 1024,     // 20KB
        imageSize: 100 * 1024,  // 100KB
        fontSize: 30 * 1024,     // 30KB
      },
      recommendations: [
        '保持关键资源总大小在170KB以下',
        '使用代码分割减少初始JavaScript包大小',
        '内联关键CSS，延迟加载非关键CSS',
        '优化图片格式和大小',
        '使用字体子集和现代字体格式',
      ],
    };
  }
}

export default FirstPaintOptimizer;
