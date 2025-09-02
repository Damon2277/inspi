/**
 * 监控过滤器
 */

import { shouldIgnoreError, categorizeError, getErrorSeverity } from './config';

/**
 * 错误过滤结果接口
 */
export interface ErrorFilterResult {
  shouldReport: boolean;
  category: string;
  severity: string;
  tags: Record<string, string>;
  fingerprint?: string[];
  reason?: string;
}

/**
 * 请求过滤结果接口
 */
export interface RequestFilterResult {
  shouldTrack: boolean;
  sampleRate: number;
  tags: Record<string, string>;
  reason?: string;
}

/**
 * 错误过滤器类
 */
export class ErrorFilter {
  private rateLimiter = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1分钟
  private readonly RATE_LIMIT_MAX = 10; // 每分钟最多10个相同错误

  /**
   * 过滤错误
   */
  filterError(error: Error, context?: {
    url?: string;
    userId?: string;
    userAgent?: string;
    component?: string;
  }): ErrorFilterResult {
    const result: ErrorFilterResult = {
      shouldReport: true,
      category: categorizeError(error),
      severity: getErrorSeverity(error),
      tags: {}
    };

    // 检查是否应该忽略
    if (shouldIgnoreError(error, context?.url)) {
      result.shouldReport = false;
      result.reason = 'Error matches ignore patterns';
      return result;
    }

    // 检查频率限制
    const fingerprint = this.generateErrorFingerprint(error, context);
    if (this.isRateLimited(fingerprint)) {
      result.shouldReport = false;
      result.reason = 'Rate limited';
      return result;
    }

    // 设置指纹
    result.fingerprint = [fingerprint];

    // 设置标签
    result.tags = {
      category: result.category,
      severity: result.severity,
      ...this.extractErrorTags(error, context)
    };

    return result;
  }

  /**
   * 生成错误指纹
   */
  private generateErrorFingerprint(error: Error, context?: any): string {
    const components = [
      error.name,
      error.message.replace(/\d+/g, 'N'), // 替换数字为N
      context?.component || 'unknown',
      context?.url ? this.normalizeUrl(context.url) : 'unknown'
    ];

    return components.join('|');
  }

  /**
   * 检查是否被频率限制
   */
  private isRateLimited(fingerprint: string): boolean {
    const now = Date.now();
    const entry = this.rateLimiter.get(fingerprint);

    if (!entry) {
      this.rateLimiter.set(fingerprint, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return false;
    }

    if (now > entry.resetTime) {
      // 重置计数器
      this.rateLimiter.set(fingerprint, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return false;
    }

    entry.count++;
    return entry.count > this.RATE_LIMIT_MAX;
  }

  /**
   * 提取错误标签
   */
  private extractErrorTags(error: Error, context?: any): Record<string, string> {
    const tags: Record<string, string> = {};

    // 从错误堆栈中提取信息
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      const firstLine = stackLines.find(line => line.includes('.tsx') || line.includes('.ts') || line.includes('.js'));
      if (firstLine) {
        const match = firstLine.match(/\/([^\/]+\.(tsx?|jsx?)):/);
        if (match) {
          tags.file = match[1];
        }
      }
    }

    // 从上下文中提取标签
    if (context?.component) {
      tags.component = context.component;
    }

    if (context?.userAgent) {
      const browser = this.extractBrowser(context.userAgent);
      if (browser) {
        tags.browser = browser;
      }
    }

    return tags;
  }

  /**
   * 规范化URL
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // 移除查询参数和哈希
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  /**
   * 从User Agent提取浏览器信息
   */
  private extractBrowser(userAgent: string): string | null {
    if (/Chrome/.test(userAgent)) return 'Chrome';
    if (/Firefox/.test(userAgent)) return 'Firefox';
    if (/Safari/.test(userAgent)) return 'Safari';
    if (/Edge/.test(userAgent)) return 'Edge';
    return null;
  }

  /**
   * 清理过期的频率限制记录
   */
  cleanupRateLimiter() {
    const now = Date.now();
    for (const [key, entry] of this.rateLimiter.entries()) {
      if (now > entry.resetTime) {
        this.rateLimiter.delete(key);
      }
    }
  }
}

/**
 * 请求过滤器类
 */
export class RequestFilter {
  /**
   * 过滤请求
   */
  filterRequest(request: {
    method: string;
    url: string;
    userAgent?: string;
    duration?: number;
    statusCode?: number;
  }): RequestFilterResult {
    const result: RequestFilterResult = {
      shouldTrack: true,
      sampleRate: 1.0,
      tags: {}
    };

    // 检查是否应该忽略的URL
    if (this.shouldIgnoreUrl(request.url)) {
      result.shouldTrack = false;
      result.reason = 'URL matches ignore patterns';
      return result;
    }

    // 设置采样率
    result.sampleRate = this.calculateSampleRate(request);

    // 设置标签
    result.tags = {
      method: request.method,
      endpoint: this.extractEndpoint(request.url),
      status_category: this.getStatusCategory(request.statusCode),
      ...this.extractRequestTags(request)
    };

    return result;
  }

  /**
   * 检查是否应该忽略URL
   */
  private shouldIgnoreUrl(url: string): boolean {
    const ignoredPatterns = [
      /\/_next\//,
      /\/api\/health/,
      /\/favicon\.ico/,
      /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/,
      /\/webpack-hmr/
    ];

    return ignoredPatterns.some(pattern => pattern.test(url));
  }

  /**
   * 计算采样率
   */
  private calculateSampleRate(request: any): number {
    // 根据请求类型调整采样率
    if (request.url.includes('/api/')) {
      return 0.5; // API请求50%采样
    }

    if (request.statusCode >= 400) {
      return 1.0; // 错误请求100%采样
    }

    if (request.duration && request.duration > 2000) {
      return 1.0; // 慢请求100%采样
    }

    return 0.1; // 其他请求10%采样
  }

  /**
   * 提取端点
   */
  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.replace(/\/\d+/g, '/:id'); // 替换数字ID为参数
    } catch {
      return url;
    }
  }

  /**
   * 获取状态码分类
   */
  private getStatusCategory(statusCode?: number): string {
    if (!statusCode) return 'unknown';
    
    if (statusCode < 300) return '2xx';
    if (statusCode < 400) return '3xx';
    if (statusCode < 500) return '4xx';
    return '5xx';
  }

  /**
   * 提取请求标签
   */
  private extractRequestTags(request: any): Record<string, string> {
    const tags: Record<string, string> = {};

    if (request.userAgent) {
      const browser = this.extractBrowser(request.userAgent);
      if (browser) {
        tags.browser = browser;
      }
    }

    if (request.duration) {
      if (request.duration > 5000) {
        tags.performance = 'very_slow';
      } else if (request.duration > 2000) {
        tags.performance = 'slow';
      } else if (request.duration > 1000) {
        tags.performance = 'normal';
      } else {
        tags.performance = 'fast';
      }
    }

    return tags;
  }

  /**
   * 从User Agent提取浏览器信息
   */
  private extractBrowser(userAgent: string): string | null {
    if (/Chrome/.test(userAgent)) return 'Chrome';
    if (/Firefox/.test(userAgent)) return 'Firefox';
    if (/Safari/.test(userAgent)) return 'Safari';
    if (/Edge/.test(userAgent)) return 'Edge';
    return null;
  }
}

/**
 * 性能过滤器类
 */
export class PerformanceFilter {
  /**
   * 过滤性能数据
   */
  filterPerformance(metric: {
    name: string;
    value: number;
    url?: string;
    component?: string;
  }): { shouldReport: boolean; tags: Record<string, string> } {
    const result = {
      shouldReport: true,
      tags: {} as Record<string, string>
    };

    // 设置标签
    result.tags = {
      metric: metric.name,
      ...this.categorizePerformance(metric)
    };

    return result;
  }

  /**
   * 性能分类
   */
  private categorizePerformance(metric: any): Record<string, string> {
    const tags: Record<string, string> = {};

    if (metric.name === 'FCP' || metric.name === 'LCP') {
      if (metric.value > 4000) {
        tags.performance_grade = 'poor';
      } else if (metric.value > 2500) {
        tags.performance_grade = 'needs_improvement';
      } else {
        tags.performance_grade = 'good';
      }
    }

    if (metric.name === 'CLS') {
      if (metric.value > 0.25) {
        tags.performance_grade = 'poor';
      } else if (metric.value > 0.1) {
        tags.performance_grade = 'needs_improvement';
      } else {
        tags.performance_grade = 'good';
      }
    }

    if (metric.component) {
      tags.component = metric.component;
    }

    return tags;
  }
}

// 创建全局过滤器实例
export const errorFilter = new ErrorFilter();
export const requestFilter = new RequestFilter();
export const performanceFilter = new PerformanceFilter();

// 定期清理频率限制记录
if (typeof window !== 'undefined') {
  setInterval(() => {
    errorFilter.cleanupRateLimiter();
  }, 300000); // 每5分钟清理一次
}

export default {
  errorFilter,
  requestFilter,
  performanceFilter
};