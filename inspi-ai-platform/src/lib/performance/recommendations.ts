/**
 * 性能优化建议系统
 */
import { logger } from '@/lib/logging/logger';
import { WebVitalsMetric } from './web-vitals';
import { CustomMetric } from './custom-metrics';
import { MemoryInfo } from './memory';

/**
 * 性能问题类型
 */
export type PerformanceIssueType = 
  | 'slow-lcp'
  | 'high-cls'
  | 'high-fid'
  | 'slow-fcp'
  | 'high-ttfb'
  | 'high-inp'
  | 'memory-leak'
  | 'high-memory-usage'
  | 'slow-api'
  | 'large-bundle'
  | 'unoptimized-images'
  | 'blocking-resources'
  | 'inefficient-rendering'
  | 'poor-caching';

/**
 * 性能问题严重程度
 */
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * 性能问题
 */
export interface PerformanceIssue {
  type: PerformanceIssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  impact: string;
  detectedAt: Date;
  metrics: {
    current: number;
    threshold: number;
    unit: string;
  };
  affectedPages?: string[];
  frequency: number; // 出现频率 (0-1)
}

/**
 * 性能建议
 */
export interface PerformanceRecommendation {
  id: string;
  issueType: PerformanceIssueType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  solution: string;
  implementation: {
    steps: string[];
    codeExamples?: Array<{
      language: string;
      code: string;
      description: string;
    }>;
    resources?: Array<{
      title: string;
      url: string;
      type: 'documentation' | 'tool' | 'article' | 'video';
    }>;
  };
  expectedImpact: {
    metric: string;
    improvement: string;
    timeframe: string;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  tags: string[];
}

/**
 * 性能分析结果
 */
export interface PerformanceAnalysis {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: PerformanceIssue[];
  recommendations: PerformanceRecommendation[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  trends: {
    improving: string[];
    degrading: string[];
    stable: string[];
  };
}

/**
 * 性能优化建议引擎
 */
export class PerformanceRecommendationEngine {
  private issues: Map<PerformanceIssueType, PerformanceIssue> = new Map();
  private recommendations: Map<string, PerformanceRecommendation> = new Map();
  private analysisHistory: PerformanceAnalysis[] = [];

  constructor() {
    this.setupRecommendations();
  }

  /**
   * 设置预定义建议
   */
  private setupRecommendations(): void {
    const recommendations: PerformanceRecommendation[] = [
      {
        id: 'optimize-lcp',
        issueType: 'slow-lcp',
        priority: 'high',
        title: 'Optimize Largest Contentful Paint (LCP)',
        description: 'LCP measures loading performance. A good LCP score is 2.5 seconds or less.',
        solution: 'Optimize images, implement lazy loading, use CDN, and preload critical resources.',
        implementation: {
          steps: [
            'Optimize and compress images (use WebP/AVIF formats)',
            'Implement lazy loading for images below the fold',
            'Use a Content Delivery Network (CDN)',
            'Preload critical resources with <link rel="preload">',
            'Minimize server response times',
            'Remove unused CSS and JavaScript'
          ],
          codeExamples: [
            {
              language: 'html',
              code: '<link rel="preload" href="/critical-image.jpg" as="image">',
              description: 'Preload critical images'
            },
            {
              language: 'javascript',
              code: `// Lazy loading with Intersection Observer
const images = document.querySelectorAll('img[data-src]');
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      imageObserver.unobserve(img);
    }
  });
});
images.forEach(img => imageObserver.observe(img));`,
              description: 'Implement lazy loading for images'
            }
          ],
          resources: [
            {
              title: 'Optimize LCP - Web.dev',
              url: 'https://web.dev/optimize-lcp/',
              type: 'documentation'
            }
          ]
        },
        expectedImpact: {
          metric: 'LCP',
          improvement: '30-50% reduction',
          timeframe: '1-2 weeks'
        },
        difficulty: 'medium',
        estimatedTime: '2-5 days',
        tags: ['loading', 'images', 'cdn', 'preload']
      },
      {
        id: 'reduce-cls',
        issueType: 'high-cls',
        priority: 'high',
        title: 'Reduce Cumulative Layout Shift (CLS)',
        description: 'CLS measures visual stability. A good CLS score is 0.1 or less.',
        solution: 'Set explicit dimensions for images and ads, avoid inserting content above existing content.',
        implementation: {
          steps: [
            'Set explicit width and height attributes for images',
            'Reserve space for ads and dynamic content',
            'Use CSS aspect-ratio property',
            'Avoid inserting content above existing content',
            'Use transform animations instead of changing layout properties'
          ],
          codeExamples: [
            {
              language: 'css',
              code: `.image-container {
  aspect-ratio: 16 / 9;
  width: 100%;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}`,
              description: 'Use aspect-ratio to prevent layout shifts'
            },
            {
              language: 'css',
              code: `.ad-placeholder {
  min-height: 250px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}`,
              description: 'Reserve space for ads'
            }
          ],
          resources: [
            {
              title: 'Optimize CLS - Web.dev',
              url: 'https://web.dev/optimize-cls/',
              type: 'documentation'
            }
          ]
        },
        expectedImpact: {
          metric: 'CLS',
          improvement: '50-80% reduction',
          timeframe: '1 week'
        },
        difficulty: 'easy',
        estimatedTime: '1-3 days',
        tags: ['layout', 'images', 'ads', 'css']
      },
      {
        id: 'improve-fid',
        issueType: 'high-fid',
        priority: 'high',
        title: 'Improve First Input Delay (FID)',
        description: 'FID measures interactivity. A good FID score is 100ms or less.',
        solution: 'Reduce JavaScript execution time, use code splitting, and defer non-critical scripts.',
        implementation: {
          steps: [
            'Break up long-running JavaScript tasks',
            'Use code splitting to reduce bundle size',
            'Defer non-critical JavaScript',
            'Use web workers for heavy computations',
            'Optimize third-party scripts'
          ],
          codeExamples: [
            {
              language: 'javascript',
              code: `// Break up long tasks
function processLargeArray(array) {
  return new Promise(resolve => {
    const batchSize = 1000;
    let index = 0;
    
    function processBatch() {
      const endIndex = Math.min(index + batchSize, array.length);
      
      for (let i = index; i < endIndex; i++) {
        // Process item
        processItem(array[i]);
      }
      
      index = endIndex;
      
      if (index < array.length) {
        setTimeout(processBatch, 0);
      } else {
        resolve();
      }
    }
    
    processBatch();
  });
}`,
              description: 'Break up long-running tasks'
            }
          ],
          resources: [
            {
              title: 'Optimize FID - Web.dev',
              url: 'https://web.dev/optimize-fid/',
              type: 'documentation'
            }
          ]
        },
        expectedImpact: {
          metric: 'FID',
          improvement: '40-60% reduction',
          timeframe: '2-3 weeks'
        },
        difficulty: 'medium',
        estimatedTime: '3-7 days',
        tags: ['javascript', 'code-splitting', 'web-workers']
      },
      {
        id: 'fix-memory-leak',
        issueType: 'memory-leak',
        priority: 'critical',
        title: 'Fix Memory Leaks',
        description: 'Memory leaks can cause performance degradation and application crashes.',
        solution: 'Identify and fix memory leaks by properly cleaning up event listeners, timers, and references.',
        implementation: {
          steps: [
            'Remove event listeners when components unmount',
            'Clear timers and intervals',
            'Unsubscribe from observables',
            'Avoid circular references',
            'Use WeakMap and WeakSet for temporary references'
          ],
          codeExamples: [
            {
              language: 'javascript',
              code: `// React component cleanup
useEffect(() => {
  const handleResize = () => {
    // Handle resize
  };
  
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);`,
              description: 'Proper event listener cleanup in React'
            },
            {
              language: 'javascript',
              code: `// Timer cleanup
useEffect(() => {
  const timer = setInterval(() => {
    // Do something
  }, 1000);
  
  return () => {
    clearInterval(timer);
  };
}, []);`,
              description: 'Clear timers on cleanup'
            }
          ],
          resources: [
            {
              title: 'Memory Management - MDN',
              url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management',
              type: 'documentation'
            }
          ]
        },
        expectedImpact: {
          metric: 'Memory Usage',
          improvement: '20-50% reduction',
          timeframe: '1-2 weeks'
        },
        difficulty: 'medium',
        estimatedTime: '2-5 days',
        tags: ['memory', 'cleanup', 'react', 'javascript']
      },
      {
        id: 'optimize-bundle-size',
        issueType: 'large-bundle',
        priority: 'medium',
        title: 'Optimize Bundle Size',
        description: 'Large JavaScript bundles slow down page loading and parsing.',
        solution: 'Use code splitting, tree shaking, and remove unused dependencies.',
        implementation: {
          steps: [
            'Implement route-based code splitting',
            'Use dynamic imports for heavy components',
            'Enable tree shaking in your bundler',
            'Remove unused dependencies',
            'Use bundle analyzer to identify large modules'
          ],
          codeExamples: [
            {
              language: 'javascript',
              code: `// Dynamic import for code splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}`,
              description: 'Dynamic imports with React.lazy'
            }
          ],
          resources: [
            {
              title: 'Code Splitting - React Docs',
              url: 'https://reactjs.org/docs/code-splitting.html',
              type: 'documentation'
            }
          ]
        },
        expectedImpact: {
          metric: 'Bundle Size',
          improvement: '20-40% reduction',
          timeframe: '1-2 weeks'
        },
        difficulty: 'medium',
        estimatedTime: '3-5 days',
        tags: ['bundle', 'code-splitting', 'tree-shaking']
      }
    ];

    recommendations.forEach(rec => {
      this.recommendations.set(rec.id, rec);
    });
  }

  /**
   * 分析Web Vitals指标
   */
  analyzeWebVitals(metrics: Record<string, WebVitalsMetric>): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    Object.entries(metrics).forEach(([name, metric]) => {
      const issue = this.checkWebVitalThreshold(name as any, metric);
      if (issue) {
        issues.push(issue);
        this.issues.set(issue.type, issue);
      }
    });

    return issues;
  }

  /**
   * 检查Web Vital阈值
   */
  private checkWebVitalThreshold(name: string, metric: WebVitalsMetric): PerformanceIssue | null {
    const thresholds = {
      LCP: { good: 2500, poor: 4000, type: 'slow-lcp' as PerformanceIssueType },
      CLS: { good: 0.1, poor: 0.25, type: 'high-cls' as PerformanceIssueType },
      FID: { good: 100, poor: 300, type: 'high-fid' as PerformanceIssueType },
      FCP: { good: 1800, poor: 3000, type: 'slow-fcp' as PerformanceIssueType },
      TTFB: { good: 800, poor: 1800, type: 'high-ttfb' as PerformanceIssueType },
      INP: { good: 200, poor: 500, type: 'high-inp' as PerformanceIssueType }
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return null;

    let severity: IssueSeverity;
    if (metric.value <= threshold.good) return null;
    if (metric.value <= threshold.poor) severity = 'medium';
    else severity = 'high';

    return {
      type: threshold.type,
      severity,
      title: `${name} Performance Issue`,
      description: `${name} value of ${metric.value.toFixed(2)} exceeds recommended threshold`,
      impact: this.getImpactDescription(threshold.type),
      detectedAt: new Date(),
      metrics: {
        current: metric.value,
        threshold: threshold.good,
        unit: name === 'CLS' ? '' : 'ms'
      },
      frequency: 1
    };
  }

  /**
   * 分析自定义指标
   */
  analyzeCustomMetrics(metrics: CustomMetric[]): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // 分析内存使用
    const memoryMetrics = metrics.filter(m => m.name.includes('memory'));
    const memoryIssue = this.analyzeMemoryMetrics(memoryMetrics);
    if (memoryIssue) {
      issues.push(memoryIssue);
      this.issues.set(memoryIssue.type, memoryIssue);
    }

    // 分析API响应时间
    const apiMetrics = metrics.filter(m => m.name.includes('api') || m.name.includes('request'));
    const apiIssue = this.analyzeApiMetrics(apiMetrics);
    if (apiIssue) {
      issues.push(apiIssue);
      this.issues.set(apiIssue.type, apiIssue);
    }

    return issues;
  }

  /**
   * 分析内存指标
   */
  private analyzeMemoryMetrics(metrics: CustomMetric[]): PerformanceIssue | null {
    const usageMetrics = metrics.filter(m => m.name.includes('usage_percentage'));
    if (usageMetrics.length === 0) return null;

    const avgUsage = usageMetrics.reduce((sum, m) => sum + m.value, 0) / usageMetrics.length;
    
    if (avgUsage > 85) {
      return {
        type: 'high-memory-usage',
        severity: 'critical',
        title: 'High Memory Usage',
        description: `Average memory usage of ${avgUsage.toFixed(1)}% is critically high`,
        impact: 'May cause application crashes and poor user experience',
        detectedAt: new Date(),
        metrics: {
          current: avgUsage,
          threshold: 70,
          unit: '%'
        },
        frequency: usageMetrics.length / metrics.length
      };
    }

    return null;
  }

  /**
   * 分析API指标
   */
  private analyzeApiMetrics(metrics: CustomMetric[]): PerformanceIssue | null {
    if (metrics.length === 0) return null;

    const avgResponseTime = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
    
    if (avgResponseTime > 2000) {
      return {
        type: 'slow-api',
        severity: 'high',
        title: 'Slow API Responses',
        description: `Average API response time of ${avgResponseTime.toFixed(0)}ms is too slow`,
        impact: 'Degrades user experience and perceived performance',
        detectedAt: new Date(),
        metrics: {
          current: avgResponseTime,
          threshold: 1000,
          unit: 'ms'
        },
        frequency: 1
      };
    }

    return null;
  }

  /**
   * 生成建议
   */
  generateRecommendations(issues: PerformanceIssue[]): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    issues.forEach(issue => {
      const recommendation = this.recommendations.get(this.getRecommendationId(issue.type));
      if (recommendation) {
        // 调整优先级基于严重程度
        const adjustedRecommendation = {
          ...recommendation,
          priority: this.adjustPriority(recommendation.priority, issue.severity)
        };
        recommendations.push(adjustedRecommendation);
      }
    });

    // 按优先级排序
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 获取建议ID
   */
  private getRecommendationId(issueType: PerformanceIssueType): string {
    const mapping = {
      'slow-lcp': 'optimize-lcp',
      'high-cls': 'reduce-cls',
      'high-fid': 'improve-fid',
      'memory-leak': 'fix-memory-leak',
      'high-memory-usage': 'fix-memory-leak',
      'large-bundle': 'optimize-bundle-size',
      'slow-api': 'optimize-api'
    };

    return mapping[issueType] || 'general-optimization';
  }

  /**
   * 调整优先级
   */
  private adjustPriority(
    basePriority: PerformanceRecommendation['priority'],
    severity: IssueSeverity
  ): PerformanceRecommendation['priority'] {
    if (severity === 'critical') return 'critical';
    if (severity === 'high' && basePriority !== 'critical') return 'high';
    return basePriority;
  }

  /**
   * 获取影响描述
   */
  private getImpactDescription(issueType: PerformanceIssueType): string {
    const impacts = {
      'slow-lcp': 'Slow loading affects user experience and SEO rankings',
      'high-cls': 'Layout shifts cause poor user experience and accidental clicks',
      'high-fid': 'Delayed interactivity frustrates users and reduces engagement',
      'slow-fcp': 'Slow first paint makes the page appear unresponsive',
      'high-ttfb': 'High server response time delays all subsequent loading',
      'high-inp': 'Poor interaction responsiveness degrades user experience',
      'memory-leak': 'Memory leaks cause performance degradation over time',
      'high-memory-usage': 'High memory usage may cause crashes and slowdowns',
      'slow-api': 'Slow API responses delay content loading and user actions',
      'large-bundle': 'Large bundles increase loading time and parsing cost',
      'unoptimized-images': 'Large images slow down loading and waste bandwidth',
      'blocking-resources': 'Blocking resources delay page rendering',
      'inefficient-rendering': 'Inefficient rendering causes jank and poor UX',
      'poor-caching': 'Poor caching leads to unnecessary network requests'
    };

    return impacts[issueType] || 'May negatively impact user experience';
  }

  /**
   * 计算性能分数
   */
  calculatePerformanceScore(issues: PerformanceIssue[]): number {
    let score = 100;

    issues.forEach(issue => {
      const penalty = {
        critical: 25,
        high: 15,
        medium: 8,
        low: 3
      };

      score -= penalty[issue.severity] * issue.frequency;
    });

    return Math.max(0, Math.round(score));
  }

  /**
   * 获取性能等级
   */
  getPerformanceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 执行完整分析
   */
  analyzePerformance(
    webVitals: Record<string, WebVitalsMetric>,
    customMetrics: CustomMetric[]
  ): PerformanceAnalysis {
    const webVitalIssues = this.analyzeWebVitals(webVitals);
    const customIssues = this.analyzeCustomMetrics(customMetrics);
    const allIssues = [...webVitalIssues, ...customIssues];

    const recommendations = this.generateRecommendations(allIssues);
    const score = this.calculatePerformanceScore(allIssues);
    const grade = this.getPerformanceGrade(score);

    const summary = {
      totalIssues: allIssues.length,
      criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
      highIssues: allIssues.filter(i => i.severity === 'high').length,
      mediumIssues: allIssues.filter(i => i.severity === 'medium').length,
      lowIssues: allIssues.filter(i => i.severity === 'low').length
    };

    const trends = this.analyzeTrends();

    const analysis: PerformanceAnalysis = {
      score,
      grade,
      issues: allIssues,
      recommendations,
      summary,
      trends
    };

    this.analysisHistory.push(analysis);
    
    // 保持最近10次分析
    if (this.analysisHistory.length > 10) {
      this.analysisHistory = this.analysisHistory.slice(-10);
    }

    logger.info('Performance analysis completed', {
      score,
      grade,
      issuesCount: allIssues.length,
      recommendationsCount: recommendations.length
    });

    return analysis;
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(): { improving: string[]; degrading: string[]; stable: string[] } {
    if (this.analysisHistory.length < 2) {
      return { improving: [], degrading: [], stable: [] };
    }

    const current = this.analysisHistory[this.analysisHistory.length - 1];
    const previous = this.analysisHistory[this.analysisHistory.length - 2];

    const improving: string[] = [];
    const degrading: string[] = [];
    const stable: string[] = [];

    // 比较分数
    const scoreDiff = current.score - previous.score;
    if (scoreDiff > 5) improving.push('Overall Performance');
    else if (scoreDiff < -5) degrading.push('Overall Performance');
    else stable.push('Overall Performance');

    // 比较问题数量
    const issueDiff = current.summary.totalIssues - previous.summary.totalIssues;
    if (issueDiff < 0) improving.push('Issue Count');
    else if (issueDiff > 0) degrading.push('Issue Count');
    else stable.push('Issue Count');

    return { improving, degrading, stable };
  }

  /**
   * 获取分析历史
   */
  getAnalysisHistory(): PerformanceAnalysis[] {
    return [...this.analysisHistory];
  }

  /**
   * 清除历史
   */
  clearHistory(): void {
    this.analysisHistory = [];
    this.issues.clear();
  }
}

/**
 * 全局性能建议引擎实例
 */
export const globalPerformanceRecommendationEngine = new PerformanceRecommendationEngine();

export default PerformanceRecommendationEngine;