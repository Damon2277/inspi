/**
 * 前端性能优化器
 * 优化邀请系统前端组件的加载和渲染性能
 */

import { logger } from '@/lib/utils/logger'

export interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  interactionTime: number
  memoryUsage: number
  bundleSize?: number
}

export interface OptimizationConfig {
  enableLazyLoading: boolean
  enableVirtualization: boolean
  enableMemoization: boolean
  enablePreloading: boolean
  chunkSize: number
  cacheSize: number
  debounceDelay: number
}

export class FrontendOptimizer {
  private config: OptimizationConfig
  private performanceObserver?: PerformanceObserver
  private metrics: PerformanceMetrics[] = []
  private componentCache: Map<string, any> = new Map()
  private preloadCache: Map<string, Promise<any>> = new Map()

  constructor(config: OptimizationConfig) {
    this.config = config
    this.initializePerformanceMonitoring()
  }

  /**
   * 初始化性能监控
   */
  private initializePerformanceMonitoring(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        this.processPerformanceEntries(entries)
      })

      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input'] 
      })
    }
  }

  /**
   * 处理性能条目
   */
  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    entries.forEach(entry => {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming
        this.recordMetrics({
          loadTime: navEntry.loadEventEnd - navEntry.loadEventStart,
          renderTime: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
          interactionTime: navEntry.domInteractive - navEntry.domLoading,
          memoryUsage: this.getMemoryUsage()
        })
      }
    })
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      return (window.performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  /**
   * 记录性能指标
   */
  private recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics)
    
    // 保持最近100条记录
    if (this.metrics.length > 100) {
      this.metrics.shift()
    }

    // 记录慢加载
    if (metrics.loadTime > 3000) {
      logger.warn('Slow page load detected', { loadTime: metrics.loadTime })
    }
  }

  /**
   * 创建懒加载组件包装器
   */
  createLazyComponent<T>(
    importFn: () => Promise<{ default: T }>,
    fallback?: React.ComponentType
  ): React.ComponentType {
    if (!this.config.enableLazyLoading) {
      // 如果禁用懒加载，直接返回动态导入
      const Component = React.lazy(importFn)
      return Component as any
    }

    const LazyComponent = React.lazy(() => {
      const startTime = performance.now()
      
      return importFn().then(module => {
        const loadTime = performance.now() - startTime
        logger.debug('Lazy component loaded', { loadTime })
        
        return module
      }).catch(error => {
        logger.error('Lazy component load failed', { error })
        throw error
      })
    })

    return (props: any) => (
      React.createElement(React.Suspense, 
        { fallback: fallback ? React.createElement(fallback) : React.createElement('div', null, 'Loading...') },
        React.createElement(LazyComponent, props)
      )
    )
  }

  /**
   * 创建虚拟化列表组件
   */
  createVirtualizedList<T>({
    items,
    itemHeight,
    containerHeight,
    renderItem,
    overscan = 5
  }: {
    items: T[]
    itemHeight: number
    containerHeight: number
    renderItem: (item: T, index: number) => React.ReactNode
    overscan?: number
  }): React.ComponentType {
    if (!this.config.enableVirtualization) {
      // 如果禁用虚拟化，渲染所有项目
      return () => React.createElement('div', 
        { style: { height: containerHeight, overflow: 'auto' } },
        items.map((item, index) => 
          React.createElement('div', 
            { key: index, style: { height: itemHeight } },
            renderItem(item, index)
          )
        )
      )
    }

    return () => {
      const [scrollTop, setScrollTop] = React.useState(0)
      
      const visibleStart = Math.floor(scrollTop / itemHeight)
      const visibleEnd = Math.min(
        visibleStart + Math.ceil(containerHeight / itemHeight) + overscan,
        items.length
      )
      
      const visibleItems = items.slice(
        Math.max(0, visibleStart - overscan),
        visibleEnd
      )

      const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop)
      }, [])

      return React.createElement('div',
        {
          style: { height: containerHeight, overflow: 'auto' },
          onScroll: handleScroll
        },
        React.createElement('div', 
          { style: { height: items.length * itemHeight, position: 'relative' } },
          visibleItems.map((item, index) => {
            const actualIndex = Math.max(0, visibleStart - overscan) + index
            return React.createElement('div',
              {
                key: actualIndex,
                style: {
                  position: 'absolute',
                  top: actualIndex * itemHeight,
                  height: itemHeight,
                  width: '100%'
                }
              },
              renderItem(item, actualIndex)
            )
          })
        )
      )
    }
  }

  /**
   * 创建记忆化组件
   */
  createMemoizedComponent<P>(
    Component: React.ComponentType<P>,
    areEqual?: (prevProps: P, nextProps: P) => boolean
  ): React.ComponentType<P> {
    if (!this.config.enableMemoization) {
      return Component
    }

    return React.memo(Component, areEqual)
  }

  /**
   * 创建防抖钩子
   */
  createDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay?: number
  ): T {
    const actualDelay = delay || this.config.debounceDelay
    
    return React.useCallback(
      this.debounce(callback, actualDelay),
      [callback, actualDelay]
    ) as T
  }

  /**
   * 防抖函数
   */
  private debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T {
    let timeoutId: NodeJS.Timeout
    
    return ((...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(this, args), delay)
    }) as T
  }

  /**
   * 预加载数据
   */
  async preloadData<T>(
    key: string,
    loadFn: () => Promise<T>,
    force = false
  ): Promise<T> {
    if (!this.config.enablePreloading && !force) {
      return loadFn()
    }

    if (this.preloadCache.has(key)) {
      return this.preloadCache.get(key)!
    }

    const promise = loadFn().then(data => {
      // 缓存数据
      this.componentCache.set(key, data)
      return data
    }).catch(error => {
      // 移除失败的预加载
      this.preloadCache.delete(key)
      throw error
    })

    this.preloadCache.set(key, promise)
    return promise
  }

  /**
   * 获取缓存数据
   */
  getCachedData<T>(key: string): T | null {
    return this.componentCache.get(key) || null
  }

  /**
   * 清理缓存
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const [key] of this.componentCache.entries()) {
        if (key.includes(pattern)) {
          this.componentCache.delete(key)
          this.preloadCache.delete(key)
        }
      }
    } else {
      this.componentCache.clear()
      this.preloadCache.clear()
    }
  }

  /**
   * 创建图片懒加载组件
   */
  createLazyImage({
    src,
    alt,
    placeholder,
    className,
    ...props
  }: {
    src: string
    alt: string
    placeholder?: string
    className?: string
    [key: string]: any
  }): React.ComponentType {
    return () => {
      const [loaded, setLoaded] = React.useState(false)
      const [inView, setInView] = React.useState(false)
      const imgRef = React.useRef<HTMLImageElement>(null)

      React.useEffect(() => {
        if (!this.config.enableLazyLoading) {
          setInView(true)
          return
        }

        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setInView(true)
              observer.disconnect()
            }
          },
          { threshold: 0.1 }
        )

        if (imgRef.current) {
          observer.observe(imgRef.current)
        }

        return () => observer.disconnect()
      }, [])

      const handleLoad = React.useCallback(() => {
        setLoaded(true)
      }, [])

      return React.createElement('div', 
        { className, ref: imgRef },
        inView && React.createElement('img', {
          src: loaded ? src : placeholder,
          alt,
          onLoad: handleLoad,
          style: {
            transition: 'opacity 0.3s',
            opacity: loaded ? 1 : 0.5
          },
          ...props
        })
      )
    }
  }

  /**
   * 创建无限滚动组件
   */
  createInfiniteScroll<T>({
    items,
    loadMore,
    hasMore,
    renderItem,
    threshold = 200
  }: {
    items: T[]
    loadMore: () => Promise<void>
    hasMore: boolean
    renderItem: (item: T, index: number) => React.ReactNode
    threshold?: number
  }): React.ComponentType {
    return () => {
      const [loading, setLoading] = React.useState(false)
      const containerRef = React.useRef<HTMLDivElement>(null)

      const handleScroll = React.useCallback(async () => {
        if (!containerRef.current || loading || !hasMore) return

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current
        
        if (scrollHeight - scrollTop - clientHeight < threshold) {
          setLoading(true)
          try {
            await loadMore()
          } finally {
            setLoading(false)
          }
        }
      }, [loading, hasMore, loadMore, threshold])

      React.useEffect(() => {
        const container = containerRef.current
        if (container) {
          container.addEventListener('scroll', handleScroll)
          return () => container.removeEventListener('scroll', handleScroll)
        }
      }, [handleScroll])

      return React.createElement('div',
        {
          ref: containerRef,
          style: { height: '100%', overflow: 'auto' }
        },
        items.map((item, index) => renderItem(item, index)),
        loading && React.createElement('div', 
          { style: { padding: '20px', textAlign: 'center' } },
          'Loading...'
        )
      )
    }
  }

  /**
   * 优化包大小分析
   */
  analyzeBundleSize(): Promise<{
    totalSize: number
    chunks: Array<{ name: string; size: number }>
    recommendations: string[]
  }> {
    return new Promise((resolve) => {
      // 模拟包大小分析
      setTimeout(() => {
        const analysis = {
          totalSize: 1024 * 1024 * 2.5, // 2.5MB
          chunks: [
            { name: 'main', size: 1024 * 1024 * 1.2 },
            { name: 'vendor', size: 1024 * 1024 * 0.8 },
            { name: 'invitation', size: 1024 * 1024 * 0.5 }
          ],
          recommendations: [
            '考虑使用动态导入拆分大型组件',
            '移除未使用的依赖项',
            '启用gzip压缩',
            '使用CDN加载第三方库'
          ]
        }
        resolve(analysis)
      }, 1000)
    })
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    averageLoadTime: number
    averageRenderTime: number
    averageMemoryUsage: number
    slowLoadCount: number
    recommendations: string[]
  } {
    if (this.metrics.length === 0) {
      return {
        averageLoadTime: 0,
        averageRenderTime: 0,
        averageMemoryUsage: 0,
        slowLoadCount: 0,
        recommendations: ['需要更多数据来生成报告']
      }
    }

    const avgLoadTime = this.metrics.reduce((sum, m) => sum + m.loadTime, 0) / this.metrics.length
    const avgRenderTime = this.metrics.reduce((sum, m) => sum + m.renderTime, 0) / this.metrics.length
    const avgMemoryUsage = this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metrics.length
    const slowLoadCount = this.metrics.filter(m => m.loadTime > 3000).length

    const recommendations: string[] = []
    
    if (avgLoadTime > 2000) {
      recommendations.push('页面加载时间较慢，考虑启用懒加载')
    }
    
    if (avgMemoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('内存使用较高，考虑启用虚拟化')
    }
    
    if (slowLoadCount > this.metrics.length * 0.1) {
      recommendations.push('频繁出现慢加载，检查网络和资源优化')
    }

    return {
      averageLoadTime: avgLoadTime,
      averageRenderTime: avgRenderTime,
      averageMemoryUsage: avgMemoryUsage,
      slowLoadCount,
      recommendations
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
    
    this.componentCache.clear()
    this.preloadCache.clear()
    this.metrics.length = 0
  }
}

// React hooks需要在实际的React环境中使用
// 这里提供类型定义和接口
declare global {
  namespace React {
    function useState<T>(initialState: T): [T, (value: T) => void]
    function useEffect(effect: () => void | (() => void), deps?: any[]): void
    function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T
    function useRef<T>(initialValue: T): { current: T }
    function memo<P>(Component: React.ComponentType<P>, areEqual?: (prevProps: P, nextProps: P) => boolean): React.ComponentType<P>
    function lazy<T>(importFn: () => Promise<{ default: T }>): React.ComponentType
    function createElement(type: any, props?: any, ...children: any[]): any
    const Suspense: React.ComponentType<{ fallback?: React.ReactNode; children: React.ReactNode }>
  }
}