/**
 * 性能调优工具
 * 基于测试结果自动调优系统性能参数
 */

interface PerformanceMetrics {
  lcp: number;
  fcp: number;
  cls: number;
  ttfb: number;
  loadTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  networkRequests: number;
  totalBytes: number;
}

interface TuningRecommendation {
  category: 'cache' | 'network' | 'rendering' | 'memory' | 'database';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  implementation: string;
  expectedImprovement: string;
  effort: 'low' | 'medium' | 'high';
  code?: string;
}

interface TuningConfig {
  cache: {
    ttl: { [key: string]: number };
    maxSize: { [key: string]: number };
    strategy: { [key: string]: string };
  };
  network: {
    preloadThreshold: number;
    compressionLevel: number;
    cdnEnabled: boolean;
  };
  rendering: {
    virtualScrollThreshold: number;
    lazyLoadOffset: number;
    imageQuality: number;
  };
  memory: {
    gcThreshold: number;
    maxHeapSize: number;
    cleanupInterval: number;
  };
}

export class PerformanceTuner {
  private currentConfig: TuningConfig;
  private baselineMetrics: PerformanceMetrics | null = null;

  constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): TuningConfig {
    return {
      cache: {
        ttl: {
          user: 3600,      // 1小时
          work: 1800,      // 30分钟
          ranking: 300,    // 5分钟
          graph: 7200,      // 2小时
        },
        maxSize: {
          user: 1000,
          work: 5000,
          ranking: 100,
          graph: 500,
        },
        strategy: {
          user: 'lru',
          work: 'lfu',
          ranking: 'ttl',
          graph: 'lru',
        },
      },
      network: {
        preloadThreshold: 0.7,
        compressionLevel: 6,
        cdnEnabled: true,
      },
      rendering: {
        virtualScrollThreshold: 100,
        lazyLoadOffset: 200,
        imageQuality: 80,
      },
      memory: {
        gcThreshold: 100 * 1024 * 1024, // 100MB
        maxHeapSize: 512 * 1024 * 1024, // 512MB
        cleanupInterval: 60000, // 1分钟
      },
    };
  }

  setBaseline(metrics: PerformanceMetrics): void {
    this.baselineMetrics = { ...metrics };
  }

  analyzePerformance(metrics: PerformanceMetrics): TuningRecommendation[] {
    const recommendations: TuningRecommendation[] = [];

    // 分析LCP性能
    if (metrics.lcp > 2500) {
      recommendations.push(...this.analyzeLCP(metrics));
    }

    // 分析FCP性能
    if (metrics.fcp > 1800) {
      recommendations.push(...this.analyzeFCP(metrics));
    }

    // 分析CLS稳定性
    if (metrics.cls > 0.1) {
      recommendations.push(...this.analyzeCLS(metrics));
    }

    // 分析TTFB响应时间
    if (metrics.ttfb > 800) {
      recommendations.push(...this.analyzeTTFB(metrics));
    }

    // 分析缓存效率
    if (metrics.cacheHitRate < 0.9) {
      recommendations.push(...this.analyzeCache(metrics));
    }

    // 分析内存使用
    if (metrics.memoryUsage > 150 * 1024 * 1024) {
      recommendations.push(...this.analyzeMemory(metrics));
    }

    // 分析网络性能
    if (metrics.networkRequests > 50 || metrics.totalBytes > 3 * 1024 * 1024) {
      recommendations.push(...this.analyzeNetwork(metrics));
    }

    return this.prioritizeRecommendations(recommendations);
  }

  private analyzeLCP(metrics: PerformanceMetrics): TuningRecommendation[] {
    const recommendations: TuningRecommendation[] = [];

    if (metrics.lcp > 4000) {
      recommendations.push({
        category: 'rendering',
        priority: 'high',
        title: '优化最大内容绘制 (LCP)',
        description: 'LCP超过4秒，严重影响用户体验',
        implementation: '实现关键资源预加载和图片优化',
        expectedImprovement: '减少LCP 30-50%',
        effort: 'medium',
        code: `
// 关键资源预加载
<link rel="preload" href="/critical.css" as="style">
<link rel="preload" href="/hero-image.webp" as="image">

// 图片优化
const optimizedImage = {
  src: '/image.webp',
  fallback: '/image.jpg',
  loading: 'eager', // 关键图片立即加载
  sizes: '(max-width: 768px) 100vw, 50vw'
};`,
      });
    } else if (metrics.lcp > 2500) {
      recommendations.push({
        category: 'cache',
        priority: 'medium',
        title: '增强缓存策略',
        description: 'LCP可通过更好的缓存策略进一步优化',
        implementation: '调整缓存TTL和预热策略',
        expectedImprovement: '减少LCP 15-25%',
        effort: 'low',
        code: `
// 调整缓存配置
const cacheConfig = {
  staticAssets: { ttl: 31536000 }, // 1年
  apiResponses: { ttl: 300 },      // 5分钟
  userContent: { ttl: 1800 }       // 30分钟
};`,
      });
    }

    return recommendations;
  }

  private analyzeFCP(metrics: PerformanceMetrics): TuningRecommendation[] {
    const recommendations: TuningRecommendation[] = [];

    if (metrics.fcp > 2500) {
      recommendations.push({
        category: 'network',
        priority: 'high',
        title: '优化首次内容绘制 (FCP)',
        description: 'FCP过慢影响用户感知性能',
        implementation: '减少阻塞渲染的资源',
        expectedImprovement: '减少FCP 25-40%',
        effort: 'medium',
        code: `
// 内联关键CSS
<style>
  /* 关键路径CSS */
  .hero { display: block; }
</style>

// 异步加载非关键CSS
<link rel="preload" href="/non-critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/non-critical.css"></noscript>`,
      });
    }

    return recommendations;
  }

  private analyzeCLS(metrics: PerformanceMetrics): TuningRecommendation[] {
    const recommendations: TuningRecommendation[] = [];

    if (metrics.cls > 0.25) {
      recommendations.push({
        category: 'rendering',
        priority: 'high',
        title: '修复累积布局偏移 (CLS)',
        description: 'CLS过高导致用户体验不佳',
        implementation: '为动态内容预留空间',
        expectedImprovement: '减少CLS 60-80%',
        effort: 'medium',
        code: `
// 为图片预留空间
.image-container {
  aspect-ratio: 16 / 9;
  background: #f0f0f0;
}

// 为动态内容预留空间
.dynamic-content {
  min-height: 200px;
  transition: height 0.3s ease;
}`,
      });
    } else if (metrics.cls > 0.1) {
      recommendations.push({
        category: 'rendering',
        priority: 'medium',
        title: '进一步优化布局稳定性',
        description: 'CLS可以进一步优化以提升用户体验',
        implementation: '优化字体加载和动画',
        expectedImprovement: '减少CLS 20-30%',
        effort: 'low',
        code: `
// 字体显示优化
@font-face {
  font-family: 'CustomFont';
  src: url('/font.woff2') format('woff2');
  font-display: swap;
}

// 避免布局抖动的动画
.smooth-animation {
  transform: translateY(0);
  transition: transform 0.3s ease;
}`,
      });
    }

    return recommendations;
  }

  private analyzeTTFB(metrics: PerformanceMetrics): TuningRecommendation[] {
    const recommendations: TuningRecommendation[] = [];

    if (metrics.ttfb > 1200) {
      recommendations.push({
        category: 'database',
        priority: 'high',
        title: '优化服务器响应时间 (TTFB)',
        description: 'TTFB过高表明服务器性能需要优化',
        implementation: '优化数据库查询和服务器配置',
        expectedImprovement: '减少TTFB 40-60%',
        effort: 'high',
        code: `
// 数据库查询优化
const optimizedQuery = {
  // 使用索引
  index: { userId: 1, createdAt: -1 },
  // 限制返回字段
  projection: { title: 1, summary: 1, createdAt: 1 },
  // 分页查询
  limit: 20,
  skip: page * 20
};

// 连接池优化
const dbConfig = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000
};`,
      });
    } else if (metrics.ttfb > 800) {
      recommendations.push({
        category: 'cache',
        priority: 'medium',
        title: '增强服务端缓存',
        description: 'TTFB可通过更好的服务端缓存优化',
        implementation: '实现多层缓存策略',
        expectedImprovement: '减少TTFB 20-35%',
        effort: 'medium',
        code: `
// 多层缓存策略
const cacheStrategy = {
  L1: 'memory',    // 内存缓存
  L2: 'redis',     // Redis缓存
  L3: 'database'   // 数据库
};

// API响应缓存
app.get('/api/data', cache('5 minutes'), handler);`,
      });
    }

    return recommendations;
  }

  private analyzeCache(metrics: PerformanceMetrics): TuningRecommendation[] {
    const recommendations: TuningRecommendation[] = [];

    if (metrics.cacheHitRate < 0.8) {
      recommendations.push({
        category: 'cache',
        priority: 'high',
        title: '提升缓存命中率',
        description: `当前缓存命中率${(metrics.cacheHitRate * 100).toFixed(1)}%，需要优化`,
        implementation: '调整缓存策略和预热机制',
        expectedImprovement: '提升命中率至90%+',
        effort: 'medium',
        code: `
// 智能缓存预热
const warmupStrategy = {
  popular: { preload: true, ttl: 3600 },
  recent: { preload: true, ttl: 1800 },
  trending: { preload: true, ttl: 300 }
};

// 缓存策略优化
const cachePolicy = {
  user: { strategy: 'lru', size: 2000, ttl: 7200 },
  content: { strategy: 'lfu', size: 5000, ttl: 3600 }
};`,
      });
    }

    return recommendations;
  }

  private analyzeMemory(metrics: PerformanceMetrics): TuningRecommendation[] {
    const recommendations: TuningRecommendation[] = [];

    const memoryMB = metrics.memoryUsage / (1024 * 1024);

    if (memoryMB > 200) {
      recommendations.push({
        category: 'memory',
        priority: 'high',
        title: '优化内存使用',
        description: `内存使用${memoryMB.toFixed(1)}MB，需要优化`,
        implementation: '实现内存清理和对象池',
        expectedImprovement: '减少内存使用30-50%',
        effort: 'medium',
        code: `
// 对象池模式
class ObjectPool {
  private pool: any[] = [];
  
  acquire() {
    return this.pool.pop() || (this.create as any)();
  }
  
  release(obj: any) {
    this.reset(obj);
    this.pool.push(obj);
  }
}

// 内存清理
useEffect(() => {
  const cleanup = () => {
    // 清理大对象引用
    heavyDataRef.current = null;
    // 清理事件监听器
    window.removeEventListener('resize', handler);
  };
  
  return cleanup;
}, []);`,
      });
    }

    return recommendations;
  }

  private analyzeNetwork(metrics: PerformanceMetrics): TuningRecommendation[] {
    const recommendations: TuningRecommendation[] = [];

    if (metrics.networkRequests > 50) {
      recommendations.push({
        category: 'network',
        priority: 'medium',
        title: '减少网络请求数量',
        description: `当前${metrics.networkRequests}个请求，建议合并优化`,
        implementation: '合并请求和资源打包',
        expectedImprovement: '减少请求数30-50%',
        effort: 'medium',
        code: `
// 请求合并
const batchAPI = {
  async fetchMultiple(requests: string[]) {
    return fetch('/api/batch', {
      method: 'POST',
      body: JSON.stringify({ requests })
    });
  }
};

// 资源打包
const bundleConfig = {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all'
      }
    }
  }
};`,
      });
    }

    if (metrics.totalBytes > 3 * 1024 * 1024) {
      recommendations.push({
        category: 'network',
        priority: 'medium',
        title: '减少传输数据量',
        description: `传输${(metrics.totalBytes / 1024 / 1024).toFixed(1)}MB数据，建议压缩优化`,
        implementation: '启用压缩和优化资源',
        expectedImprovement: '减少传输量40-60%',
        effort: 'low',
        code: `
// Gzip压缩
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    return compression.filter(req, res);
  }
}));

// 图片优化
const imageOptimization = {
  format: 'webp',
  quality: 80,
  progressive: true,
  sizes: [320, 640, 1024, 1920]
};`,
      });
    }

    return recommendations;
  }

  private prioritizeRecommendations(recommendations: TuningRecommendation[]): TuningRecommendation[] {
    return recommendations.sort((a, b) => {
      // 优先级排序
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];

      if (priorityDiff !== 0) return priorityDiff;

      // 努力程度排序（低努力优先）
      const effortOrder = { low: 3, medium: 2, high: 1 };
      return effortOrder[b.effort] - effortOrder[a.effort];
    });
  }

  generateTuningPlan(metrics: PerformanceMetrics): {
    recommendations: TuningRecommendation[];
    estimatedImprovement: string;
    implementationOrder: string[];
    timeline: string;
  } {
    const recommendations = this.analyzePerformance(metrics);

    // 估算整体改进效果
    const highPriorityCount = recommendations.filter(r => r.priority === 'high').length;
    const mediumPriorityCount = recommendations.filter(r => r.priority === 'medium').length;

    let estimatedImprovement = '10-20%';
    if (highPriorityCount >= 3) {
      estimatedImprovement = '40-60%';
    } else if (highPriorityCount >= 1 || mediumPriorityCount >= 3) {
      estimatedImprovement = '25-40%';
    }

    // 实施顺序
    const implementationOrder = recommendations
      .filter(r => r.priority === 'high')
      .map(r => r.title)
      .concat(
        recommendations
          .filter(r => r.priority === 'medium' && r.effort === 'low')
          .map(r => r.title),
      );

    // 时间线估算
    const totalEffort = recommendations.reduce((sum, r) => {
      const effortPoints = { low: 1, medium: 3, high: 7 };
      return sum + effortPoints[r.effort];
    }, 0);

    let timeline = '1-2周';
    if (totalEffort > 20) {
      timeline = '1-2月';
    } else if (totalEffort > 10) {
      timeline = '3-4周';
    }

    return {
      recommendations,
      estimatedImprovement,
      implementationOrder,
      timeline,
    };
  }

  applyAutoTuning(metrics: PerformanceMetrics): TuningConfig {
    const newConfig = { ...this.currentConfig };

    // 自动调整缓存TTL
    if (metrics.cacheHitRate < 0.85) {
      // 增加TTL以提高命中率
      Object.keys(newConfig.cache.ttl).forEach(key => {
        newConfig.cache.ttl[key] *= 1.5;
      });
    }

    // 自动调整虚拟滚动阈值
    if (metrics.memoryUsage > 100 * 1024 * 1024) {
      // 降低阈值以减少内存使用
      newConfig.rendering.virtualScrollThreshold = Math.max(50,
        newConfig.rendering.virtualScrollThreshold * 0.8,
      );
    }

    // 自动调整图片质量
    if (metrics.totalBytes > 2 * 1024 * 1024) {
      // 降低图片质量以减少传输量
      newConfig.rendering.imageQuality = Math.max(60,
        newConfig.rendering.imageQuality - 10,
      );
    }

    // 自动调整预加载阈值
    if (metrics.lcp > 3000) {
      // 提高预加载阈值以改善LCP
      newConfig.network.preloadThreshold = Math.min(0.9,
        newConfig.network.preloadThreshold + 0.1,
      );
    }

    this.currentConfig = newConfig;
    return newConfig;
  }

  exportConfig(): string {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  importConfig(configJson: string): void {
    try {
      this.currentConfig = JSON.parse(configJson);
    } catch (error) {
      throw new Error('Invalid configuration JSON');
    }
  }

  compareWithBaseline(currentMetrics: PerformanceMetrics): {
    improvements: { [key: string]: number };
    regressions: { [key: string]: number };
    summary: string;
  } {
    if (!this.baselineMetrics) {
      throw new Error('No baseline metrics set');
    }

    const improvements: { [key: string]: number } = {};
    const regressions: { [key: string]: number } = {};

    const metrics = [
      'lcp', 'fcp', 'cls', 'ttfb', 'loadTime', 'memoryUsage',
    ] as const;

    metrics.forEach(metric => {
      const baseline = this.baselineMetrics![metric];
      const current = currentMetrics[metric];
      const change = ((baseline - current) / baseline) * 100;

      if (change > 5) {
        improvements[metric] = change;
      } else if (change < -5) {
        regressions[metric] = Math.abs(change);
      }
    });

    // 缓存命中率特殊处理（越高越好）
    const cacheChange = ((currentMetrics.cacheHitRate - this.baselineMetrics.cacheHitRate) / this.baselineMetrics.cacheHitRate) * 100;
    if (cacheChange > 5) {
      improvements.cacheHitRate = cacheChange;
    } else if (cacheChange < -5) {
      regressions.cacheHitRate = Math.abs(cacheChange);
    }

    const improvementCount = Object.keys(improvements).length;
    const regressionCount = Object.keys(regressions).length;

    let summary = '';
    if (improvementCount > regressionCount) {
      summary = `性能整体提升，${improvementCount}项指标改善，${regressionCount}项指标下降`;
    } else if (regressionCount > improvementCount) {
      summary = `性能有所下降，${regressionCount}项指标下降，${improvementCount}项指标改善`;
    } else {
      summary = `性能基本持平，${improvementCount}项指标改善，${regressionCount}项指标下降`;
    }

    return { improvements, regressions, summary };
  }
}

// 全局性能调优器实例
export const globalPerformanceTuner = new PerformanceTuner();
