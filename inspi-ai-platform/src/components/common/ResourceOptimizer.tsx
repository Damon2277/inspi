/**
 * 资源优化组件
 */
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logging/logger';
import ResourcePreloader, { PreloadConfig, ResourceType } from '@/lib/performance/preload';
import PerformanceMonitor from '@/lib/performance/metrics';

/**
 * 资源优化器属性
 */
interface ResourceOptimizerProps {
  // 预加载配置
  criticalResources?: PreloadConfig[];
  importantResources?: PreloadConfig[];
  
  // 外部域名预连接
  externalDomains?: string[];
  
  // 字体预加载
  fonts?: Array<{
    href: string;
    format?: string;
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  }>;
  
  // 图片预加载
  images?: Array<{
    href: string;
    sizes?: string;
    srcset?: string;
    media?: string;
  }>;
  
  // 智能预加载配置
  smartPreload?: {
    enabled: boolean;
    mouseoverDelay?: number;
    touchDelay?: number;
    visibilityThreshold?: number;
  };
  
  // 性能监控配置
  performanceMonitoring?: {
    enabled: boolean;
    reportEndpoint?: string;
    reportInterval?: number;
  };
  
  // 子组件
  children?: React.ReactNode;
}

/**
 * 资源优化器组件
 */
const ResourceOptimizer: React.FC<ResourceOptimizerProps> = ({
  criticalResources = [],
  importantResources = [],
  externalDomains = [],
  fonts = [],
  images = [],
  smartPreload = { enabled: true },
  performanceMonitoring = { enabled: true },
  children
}) => {
  const preloaderRef = useRef<ResourcePreloader | null>(null);
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [performanceScore, setPerformanceScore] = useState<string>('unknown');

  useEffect(() => {
    // 初始化资源预加载器
    if (!preloaderRef.current) {
      preloaderRef.current = new ResourcePreloader();
    }

    // 初始化性能监控器
    if (performanceMonitoring.enabled && !performanceMonitorRef.current) {
      performanceMonitorRef.current = new PerformanceMonitor();
    }

    const initializeOptimizations = async () => {
      try {
        const preloader = preloaderRef.current!;

        // 1. 预连接外部域名
        if (externalDomains.length > 0) {
          preloader.preconnectDomains(externalDomains);
          preloader.dnsPrefetch(externalDomains);
        }

        // 2. 预加载关键资源
        if (criticalResources.length > 0) {
          await preloader.preloadCritical(criticalResources);
        }

        // 3. 预加载字体
        if (fonts.length > 0) {
          await preloader.preloadFonts(fonts);
        }

        // 4. 预加载图片
        if (images.length > 0) {
          await preloader.preloadImages(images);
        }

        // 5. 预获取重要资源
        if (importantResources.length > 0) {
          await preloader.prefetchImportant(importantResources);
        }

        // 6. 启用智能预加载
        if (smartPreload.enabled) {
          preloader.smartPreload({
            mouseoverDelay: smartPreload.mouseoverDelay,
            touchDelay: smartPreload.touchDelay,
            visibilityThreshold: smartPreload.visibilityThreshold
          });
        }

        setIsInitialized(true);
        logger.info('Resource optimization initialized');

      } catch (error) {
        logger.error('Resource optimization initialization failed', error instanceof Error ? error : new Error(String(error)));
      }
    };

    initializeOptimizations();

    // 设置性能监控报告
    if (performanceMonitoring.enabled && performanceMonitoring.reportEndpoint) {
      const reportInterval = performanceMonitoring.reportInterval || 30000; // 30秒
      
      const intervalId = setInterval(async () => {
        if (performanceMonitorRef.current) {
          try {
            await performanceMonitorRef.current.sendReport(performanceMonitoring.reportEndpoint!);
            
            // 更新性能评分
            const evaluation = performanceMonitorRef.current.evaluatePerformance();
            setPerformanceScore(evaluation.overall);
            
          } catch (error) {
            logger.error('Performance report failed', error instanceof Error ? error : new Error(String(error)));
          }
        }
      }, reportInterval);

      return () => {
        clearInterval(intervalId);
      };
    }

    // 清理函数
    return () => {
      if (preloaderRef.current) {
        preloaderRef.current.cleanup();
      }
      if (performanceMonitorRef.current) {
        performanceMonitorRef.current.cleanup();
      }
    };
  }, []);

  // 开发环境下显示性能信息
  const showPerformanceInfo = process.env.NODE_ENV === 'development' && performanceMonitoring.enabled;

  return (
    <>
      {children}
      
      {/* 开发环境性能信息显示 */}
      {showPerformanceInfo && (
        <PerformanceInfo
          isInitialized={isInitialized}
          performanceScore={performanceScore}
          preloader={preloaderRef.current}
          monitor={performanceMonitorRef.current}
        />
      )}
    </>
  );
};

/**
 * 性能信息显示组件（仅开发环境）
 */
interface PerformanceInfoProps {
  isInitialized: boolean;
  performanceScore: string;
  preloader: ResourcePreloader | null;
  monitor: PerformanceMonitor | null;
}

const PerformanceInfo: React.FC<PerformanceInfoProps> = ({
  isInitialized,
  performanceScore,
  preloader,
  monitor
}) => {
  const [stats, setStats] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isInitialized && preloader && monitor) {
      const updateStats = () => {
        const preloadStats = preloader.getStats();
        const performanceReport = monitor.getPerformanceReport();
        const evaluation = monitor.evaluatePerformance();
        
        setStats({
          preload: preloadStats,
          webVitals: performanceReport.webVitals,
          evaluation
        });
      };

      updateStats();
      const intervalId = setInterval(updateStats, 5000); // 每5秒更新

      return () => clearInterval(intervalId);
    }
  }, [isInitialized, preloader, monitor]);

  if (!stats) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: '300px',
        cursor: 'pointer'
      }}
      onClick={() => setIsVisible(!isVisible)}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        🚀 Performance Monitor
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        Status: {isInitialized ? '✅ Ready' : '⏳ Loading'}
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        Score: {getScoreEmoji(performanceScore)} {performanceScore}
      </div>

      {isVisible && (
        <div style={{ marginTop: '10px', fontSize: '11px' }}>
          <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Web Vitals:</div>
          <div>LCP: {stats.webVitals.LCP || 'N/A'}ms</div>
          <div>FID: {stats.webVitals.FID || 'N/A'}ms</div>
          <div>CLS: {stats.webVitals.CLS || 'N/A'}</div>
          <div>FCP: {stats.webVitals.FCP || 'N/A'}ms</div>
          <div>TTFB: {stats.webVitals.TTFB || 'N/A'}ms</div>
          
          <div style={{ marginTop: '10px', marginBottom: '5px', fontWeight: 'bold' }}>Preload:</div>
          <div>Total: {stats.preload.totalResources}</div>
          <div>Loaded: {stats.preload.loadedResources}</div>
          <div>Failed: {stats.preload.failedResources}</div>
          <div>Hit Rate: {stats.preload.cacheHitRate.toFixed(1)}%</div>
          
          {stats.evaluation.recommendations.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Recommendations:</div>
              {stats.evaluation.recommendations.slice(0, 2).map((rec: string, index: number) => (
                <div key={index} style={{ fontSize: '10px', marginBottom: '2px' }}>
                  • {rec.substring(0, 50)}...
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 获取性能评分表情符号
 */
function getScoreEmoji(score: string): string {
  switch (score) {
    case 'good':
      return '🟢';
    case 'needs-improvement':
      return '🟡';
    case 'poor':
      return '🔴';
    default:
      return '⚪';
  }
}

/**
 * 预设配置
 */
export const presetConfigs = {
  /**
   * 基础配置
   */
  basic: {
    externalDomains: [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ],
    fonts: [
      {
        href: '/fonts/inter-var.woff2',
        format: 'woff2',
        display: 'swap' as const
      }
    ],
    smartPreload: {
      enabled: true,
      mouseoverDelay: 100,
      touchDelay: 150
    },
    performanceMonitoring: {
      enabled: true,
      reportInterval: 30000
    }
  },

  /**
   * 高性能配置
   */
  performance: {
    criticalResources: [
      {
        href: '/styles/critical.css',
        as: ResourceType.STYLE,
        importance: 'high' as const
      },
      {
        href: '/scripts/critical.js',
        as: ResourceType.SCRIPT,
        importance: 'high' as const
      }
    ],
    importantResources: [
      {
        href: '/styles/main.css',
        as: ResourceType.STYLE
      },
      {
        href: '/scripts/main.js',
        as: ResourceType.SCRIPT
      }
    ],
    externalDomains: [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdn.jsdelivr.net'
    ],
    fonts: [
      {
        href: '/fonts/inter-var.woff2',
        format: 'woff2',
        display: 'swap' as const
      },
      {
        href: '/fonts/inter-italic.woff2',
        format: 'woff2',
        display: 'swap' as const
      }
    ],
    images: [
      {
        href: '/images/hero.webp',
        sizes: '(max-width: 768px) 100vw, 50vw'
      }
    ],
    smartPreload: {
      enabled: true,
      mouseoverDelay: 50,
      touchDelay: 100,
      visibilityThreshold: 0.1
    },
    performanceMonitoring: {
      enabled: true,
      reportInterval: 15000
    }
  },

  /**
   * 移动端优化配置
   */
  mobile: {
    criticalResources: [
      {
        href: '/styles/mobile-critical.css',
        as: ResourceType.STYLE,
        importance: 'high' as const,
        media: '(max-width: 768px)'
      }
    ],
    externalDomains: [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ],
    fonts: [
      {
        href: '/fonts/inter-subset.woff2',
        format: 'woff2',
        display: 'swap' as const
      }
    ],
    smartPreload: {
      enabled: true,
      mouseoverDelay: 200,
      touchDelay: 300,
      visibilityThreshold: 0.2
    },
    performanceMonitoring: {
      enabled: true,
      reportInterval: 60000
    }
  }
};

export default ResourceOptimizer;