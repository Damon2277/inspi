/**
 * 关键资源预加载系统
 */
import { logger } from '@/lib/logging/logger';

/**
 * 预加载类型
 */
export enum PreloadType {
  PRELOAD = 'preload',
  PREFETCH = 'prefetch',
  PRECONNECT = 'preconnect',
  DNS_PREFETCH = 'dns-prefetch',
  MODULE_PRELOAD = 'modulepreload'
}

/**
 * 资源类型
 */
export enum ResourceType {
  SCRIPT = 'script',
  STYLE = 'style',
  IMAGE = 'image',
  FONT = 'font',
  FETCH = 'fetch',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio'
}

/**
 * 预加载配置
 */
export interface PreloadConfig {
  href: string;
  as?: ResourceType;
  type?: string;
  crossorigin?: 'anonymous' | 'use-credentials';
  media?: string;
  importance?: 'high' | 'low' | 'auto';
  fetchpriority?: 'high' | 'low' | 'auto';
  integrity?: string;
  sizes?: string;
  imageSrcSet?: string;
  imageSizes?: string;
}

/**
 * 预加载策略
 */
export interface PreloadStrategy {
  critical: PreloadConfig[]; // 关键资源
  important: PreloadConfig[]; // 重要资源
  optional: PreloadConfig[]; // 可选资源
  lazy: PreloadConfig[]; // 懒加载资源
}

/**
 * 预加载统计
 */
export interface PreloadStats {
  totalResources: number;
  loadedResources: number;
  failedResources: number;
  averageLoadTime: number;
  cacheHitRate: number;
  resourceBreakdown: Record<ResourceType, {
    count: number;
    loaded: number;
    failed: number;
    averageTime: number;
  }>;
}

/**
 * 资源预加载管理器
 */
export class ResourcePreloader {
  private loadedResources = new Set<string>();
  private failedResources = new Set<string>();
  private loadTimes = new Map<string, number>();
  private observers = new Map<string, IntersectionObserver>();
  private preloadCache = new Map<string, HTMLLinkElement>();

  /**
   * 预加载关键资源
   */
  async preloadCritical(resources: PreloadConfig[]): Promise<void> {
    logger.info('Starting critical resource preload', { count: resources.length });

    const preloadPromises = resources.map(async (config) => {
      try {
        await this.preloadResource(config, PreloadType.PRELOAD);
      } catch (error) {
        logger.error('Critical resource preload failed', error instanceof Error ? error : new Error(String(error)), {
          href: config.href
        });
      }
    });

    await Promise.allSettled(preloadPromises);
    logger.info('Critical resource preload completed');
  }

  /**
   * 预获取重要资源
   */
  async prefetchImportant(resources: PreloadConfig[]): Promise<void> {
    logger.info('Starting important resource prefetch', { count: resources.length });

    // 延迟执行，避免阻塞关键资源
    setTimeout(async () => {
      const prefetchPromises = resources.map(async (config) => {
        try {
          await this.preloadResource(config, PreloadType.PREFETCH);
        } catch (error) {
          logger.warn('Important resource prefetch failed', {
            href: config.href,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      await Promise.allSettled(prefetchPromises);
      logger.info('Important resource prefetch completed');
    }, 1000); // 1秒延迟
  }

  /**
   * 懒加载可选资源
   */
  lazyLoadOptional(resources: PreloadConfig[], trigger?: Element): void {
    if (!trigger) {
      // 在空闲时间加载
      this.scheduleIdleLoad(resources);
      return;
    }

    // 基于交叉观察器的懒加载
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            resources.forEach(async (config) => {
              try {
                await this.preloadResource(config, PreloadType.PREFETCH);
              } catch (error) {
                logger.warn('Optional resource lazy load failed', {
                  href: config.href,
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            });
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // 提前50px开始加载
        threshold: 0.1
      }
    );

    observer.observe(trigger);
    this.observers.set(trigger.id || 'default', observer);
  }

  /**
   * 预连接到外部域名
   */
  preconnectDomains(domains: string[]): void {
    domains.forEach((domain) => {
      this.createPreconnectLink(domain);
    });

    logger.debug('Preconnected to domains', { domains });
  }

  /**
   * DNS预解析
   */
  dnsPrefetch(domains: string[]): void {
    domains.forEach((domain) => {
      this.createDnsPrefetchLink(domain);
    });

    logger.debug('DNS prefetch initiated', { domains });
  }

  /**
   * 预加载字体
   */
  async preloadFonts(fonts: Array<{
    href: string;
    format?: string;
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  }>): Promise<void> {
    const fontPromises = fonts.map(async (font) => {
      const config: PreloadConfig = {
        href: font.href,
        as: ResourceType.FONT,
        type: font.format ? `font/${font.format}` : undefined,
        crossorigin: 'anonymous'
      };

      try {
        await this.preloadResource(config, PreloadType.PRELOAD);
        
        // 设置font-display属性
        if (font.display) {
          this.setFontDisplay(font.href, font.display);
        }
      } catch (error) {
        logger.error('Font preload failed', error instanceof Error ? error : new Error(String(error)), {
          href: font.href
        });
      }
    });

    await Promise.allSettled(fontPromises);
    logger.info('Font preload completed', { count: fonts.length });
  }

  /**
   * 预加载图片
   */
  async preloadImages(images: Array<{
    href: string;
    sizes?: string;
    srcset?: string;
    media?: string;
  }>): Promise<void> {
    const imagePromises = images.map(async (image) => {
      const config: PreloadConfig = {
        href: image.href,
        as: ResourceType.IMAGE,
        sizes: image.sizes,
        imageSrcSet: image.srcset,
        media: image.media
      };

      try {
        await this.preloadResource(config, PreloadType.PRELOAD);
      } catch (error) {
        logger.error('Image preload failed', error instanceof Error ? error : new Error(String(error)), {
          href: image.href
        });
      }
    });

    await Promise.allSettled(imagePromises);
    logger.info('Image preload completed', { count: images.length });
  }

  /**
   * 智能预加载（基于用户行为）
   */
  smartPreload(config: {
    mouseoverDelay?: number;
    touchDelay?: number;
    visibilityThreshold?: number;
  } = {}): void {
    const {
      mouseoverDelay = 100,
      touchDelay = 150,
      visibilityThreshold = 0.1
    } = config;

    // 鼠标悬停预加载
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && this.shouldPreload(link.href)) {
        setTimeout(() => {
          this.preloadPage(link.href);
        }, mouseoverDelay);
      }
    });

    // 触摸开始预加载
    document.addEventListener('touchstart', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && this.shouldPreload(link.href)) {
        setTimeout(() => {
          this.preloadPage(link.href);
        }, touchDelay);
      }
    });

    // 可见性预加载
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            if (link.href && this.shouldPreload(link.href)) {
              this.preloadPage(link.href);
            }
          }
        });
      },
      { threshold: visibilityThreshold }
    );

    // 观察所有链接
    document.querySelectorAll('a[href]').forEach((link) => {
      observer.observe(link);
    });
  }

  /**
   * 获取预加载统计
   */
  getStats(): PreloadStats {
    const totalResources = this.loadedResources.size + this.failedResources.size;
    const loadedCount = this.loadedResources.size;
    const failedCount = this.failedResources.size;

    const loadTimes = Array.from(this.loadTimes.values());
    const averageLoadTime = loadTimes.length > 0
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
      : 0;

    // 计算缓存命中率（简化版）
    const cacheHitRate = totalResources > 0 ? (loadedCount / totalResources) * 100 : 0;

    return {
      totalResources,
      loadedResources: loadedCount,
      failedResources: failedCount,
      averageLoadTime,
      cacheHitRate,
      resourceBreakdown: {} // 这里可以添加详细的资源类型统计
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 清理观察器
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();

    // 清理预加载缓存
    this.preloadCache.forEach((link) => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    });
    this.preloadCache.clear();

    logger.info('Resource preloader cleaned up');
  }

  /**
   * 预加载单个资源
   */
  private async preloadResource(config: PreloadConfig, type: PreloadType): Promise<void> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = type;
      link.href = config.href;

      if (config.as) {
        link.as = config.as;
      }

      if (config.type) {
        link.type = config.type;
      }

      if (config.crossorigin) {
        link.crossOrigin = config.crossorigin;
      }

      if (config.media) {
        link.media = config.media;
      }

      if (config.importance) {
        link.setAttribute('importance', config.importance);
      }

      if (config.fetchpriority) {
        link.setAttribute('fetchpriority', config.fetchpriority);
      }

      if (config.integrity) {
        link.integrity = config.integrity;
      }

      if (config.sizes) {
        link.sizes = config.sizes;
      }

      if (config.imageSrcSet) {
        link.setAttribute('imagesrcset', config.imageSrcSet);
      }

      if (config.imageSizes) {
        link.setAttribute('imagesizes', config.imageSizes);
      }

      link.onload = () => {
        const loadTime = Date.now() - startTime;
        this.loadedResources.add(config.href);
        this.loadTimes.set(config.href, loadTime);
        
        logger.debug('Resource preloaded successfully', {
          href: config.href,
          type,
          loadTime
        });
        
        resolve();
      };

      link.onerror = () => {
        this.failedResources.add(config.href);
        
        logger.warn('Resource preload failed', {
          href: config.href,
          type
        });
        
        reject(new Error(`Failed to preload ${config.href}`));
      };

      document.head.appendChild(link);
      this.preloadCache.set(config.href, link);
    });
  }

  /**
   * 创建预连接链接
   */
  private createPreconnectLink(domain: string): void {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    
    document.head.appendChild(link);
    this.preloadCache.set(`preconnect:${domain}`, link);
  }

  /**
   * 创建DNS预解析链接
   */
  private createDnsPrefetchLink(domain: string): void {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    
    document.head.appendChild(link);
    this.preloadCache.set(`dns-prefetch:${domain}`, link);
  }

  /**
   * 设置字体显示属性
   */
  private setFontDisplay(href: string, display: string): void {
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-display: ${display};
        src: url('${href}');
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 预加载页面
   */
  private async preloadPage(href: string): Promise<void> {
    if (this.loadedResources.has(href)) {
      return; // 已经预加载过
    }

    try {
      const config: PreloadConfig = {
        href,
        as: ResourceType.DOCUMENT
      };

      await this.preloadResource(config, PreloadType.PREFETCH);
    } catch (error) {
      logger.warn('Page preload failed', {
        href,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 判断是否应该预加载
   */
  private shouldPreload(href: string): boolean {
    // 检查是否是同域名
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) {
        return false;
      }

      // 检查是否已经预加载过
      if (this.loadedResources.has(href) || this.failedResources.has(href)) {
        return false;
      }

      // 检查是否是特殊链接
      if (href.includes('#') || href.includes('mailto:') || href.includes('tel:')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 在空闲时间加载资源
   */
  private scheduleIdleLoad(resources: PreloadConfig[]): void {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        resources.forEach(async (config) => {
          try {
            await this.preloadResource(config, PreloadType.PREFETCH);
          } catch (error) {
            logger.warn('Idle resource load failed', {
              href: config.href,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        });
      });
    } else {
      // 降级到setTimeout
      setTimeout(() => {
        resources.forEach(async (config) => {
          try {
            await this.preloadResource(config, PreloadType.PREFETCH);
          } catch (error) {
            logger.warn('Idle resource load failed', {
              href: config.href,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        });
      }, 2000);
    }
  }
}

/**
 * 预加载工具函数
 */
export class PreloadUtils {
  /**
   * 检测浏览器支持
   */
  static checkSupport(): {
    preload: boolean;
    prefetch: boolean;
    preconnect: boolean;
    modulePreload: boolean;
    intersectionObserver: boolean;
    requestIdleCallback: boolean;
  } {
    const link = document.createElement('link');
    
    return {
      preload: link.relList?.supports?.('preload') ?? false,
      prefetch: link.relList?.supports?.('prefetch') ?? false,
      preconnect: link.relList?.supports?.('preconnect') ?? false,
      modulePreload: link.relList?.supports?.('modulepreload') ?? false,
      intersectionObserver: 'IntersectionObserver' in window,
      requestIdleCallback: 'requestIdleCallback' in window
    };
  }

  /**
   * 获取关键资源配置
   */
  static getCriticalResources(): PreloadConfig[] {
    return [
      // 关键CSS
      {
        href: '/styles/critical.css',
        as: ResourceType.STYLE,
        importance: 'high'
      },
      // 关键字体
      {
        href: '/fonts/main.woff2',
        as: ResourceType.FONT,
        type: 'font/woff2',
        crossorigin: 'anonymous',
        importance: 'high'
      },
      // 关键JavaScript
      {
        href: '/scripts/critical.js',
        as: ResourceType.SCRIPT,
        importance: 'high'
      }
    ];
  }

  /**
   * 获取重要资源配置
   */
  static getImportantResources(): PreloadConfig[] {
    return [
      // 主要样式
      {
        href: '/styles/main.css',
        as: ResourceType.STYLE
      },
      // 主要脚本
      {
        href: '/scripts/main.js',
        as: ResourceType.SCRIPT
      },
      // 重要图片
      {
        href: '/images/hero.webp',
        as: ResourceType.IMAGE,
        imageSizes: '(max-width: 768px) 100vw, 50vw'
      }
    ];
  }

  /**
   * 获取外部域名列表
   */
  static getExternalDomains(): string[] {
    return [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdn.jsdelivr.net',
      'https://unpkg.com'
    ];
  }

  /**
   * 创建预加载策略
   */
  static createStrategy(): PreloadStrategy {
    return {
      critical: PreloadUtils.getCriticalResources(),
      important: PreloadUtils.getImportantResources(),
      optional: [],
      lazy: []
    };
  }
}

export default ResourcePreloader;