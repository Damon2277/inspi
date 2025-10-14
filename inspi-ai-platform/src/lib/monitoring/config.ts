/**
 * 监控系统配置
 */

/**
 * 监控配置接口
 */
export interface MonitoringConfig {
  sentry: {
    enabled: boolean;
    dsn: string;
    environment: string;
    tracesSampleRate: number;
    debug: boolean;
    release?: string;
  };
  performance: {
    enabled: boolean;
    sampleRate: number;
    slowThreshold: number;
    memoryThreshold: number;
  };
  health: {
    enabled: boolean;
    interval: number;
    endpoints: string[];
  };
  alerts: {
    enabled: boolean;
    channels: {
      email?: string[];
      slack?: string;
      webhook?: string;
    };
    thresholds: {
      errorRate: number;
      responseTime: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
}

/**
 * 获取监控配置
 */
export function getMonitoringConfig(): MonitoringConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    sentry: {
      enabled: Boolean(process.env.SENTRY_DSN),
      dsn: process.env.SENTRY_DSN || '',
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: isProduction ? 0.1 : 1.0,
      debug: isDevelopment,
      release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    },
    performance: {
      enabled: process.env.ENABLE_PERFORMANCE_MONITORING === 'true' || isDevelopment,
      sampleRate: isProduction ? 0.1 : 1.0,
      slowThreshold: parseInt(process.env.SLOW_THRESHOLD || '1000', 10), // 1秒
      memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD || '500', 10), // 500MB
    },
    health: {
      enabled: true,
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10), // 30秒
      endpoints: [
        '/api/health',
        '/api/health/database',
        '/api/health/redis',
      ],
    },
    alerts: {
      enabled: isProduction,
      channels: {
        email: process.env.ALERT_EMAILS?.split(','),
        slack: process.env.SLACK_WEBHOOK_URL,
        webhook: process.env.ALERT_WEBHOOK_URL,
      },
      thresholds: {
        errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '0.05'), // 5%
        responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '2000', 10), // 2秒
        memoryUsage: parseFloat(process.env.MEMORY_USAGE_THRESHOLD || '0.8'), // 80%
        cpuUsage: parseFloat(process.env.CPU_USAGE_THRESHOLD || '0.8'), // 80%
      },
    },
  };
}

/**
 * 错误分类配置
 */
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  BUSINESS_LOGIC: 'business_logic',
  SYSTEM: 'system',
  EXTERNAL_SERVICE: 'external_service',
  DATABASE: 'database',
  CACHE: 'cache',
  FILE_SYSTEM: 'file_system',
} as const;

/**
 * 错误严重级别
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

/**
 * 性能指标类型
 */
export const PERFORMANCE_METRICS = {
  RESPONSE_TIME: 'response_time',
  THROUGHPUT: 'throughput',
  ERROR_RATE: 'error_rate',
  MEMORY_USAGE: 'memory_usage',
  CPU_USAGE: 'cpu_usage',
  DATABASE_QUERY_TIME: 'database_query_time',
  CACHE_HIT_RATE: 'cache_hit_rate',
  API_LATENCY: 'api_latency',
} as const;

/**
 * 监控标签
 */
export const MONITORING_TAGS = {
  ENVIRONMENT: 'environment',
  SERVICE: 'service',
  VERSION: 'version',
  USER_ID: 'user_id',
  REQUEST_ID: 'request_id',
  ENDPOINT: 'endpoint',
  METHOD: 'method',
  STATUS_CODE: 'status_code',
  ERROR_TYPE: 'error_type',
  BROWSER: 'browser',
  OS: 'os',
  DEVICE: 'device',
} as const;

/**
 * 忽略的错误模式
 */
export const IGNORED_ERROR_PATTERNS = [
  // 网络相关错误
  /Network request failed/i,
  /fetch.*failed/i,
  /ERR_NETWORK/i,
  /ERR_INTERNET_DISCONNECTED/i,

  // 浏览器相关错误
  /ChunkLoadError/i,
  /Loading chunk \d+ failed/i,
  /Loading CSS chunk \d+ failed/i,
  /ResizeObserver loop limit exceeded/i,

  // 第三方脚本错误
  /Script error/i,
  /Non-Error promise rejection captured/i,

  // 开发环境错误
  /HMR/i,
  /webpack/i,

  // 用户取消操作
  /AbortError/i,
  /The user aborted a request/i,

  // 权限相关（可能是正常的业务逻辑）
  /Permission denied/i,
  /Unauthorized/i,
];

/**
 * 忽略的URL模式
 */
export const IGNORED_URL_PATTERNS = [
  // Next.js内部路径
  /\/_next\//,
  /\/__nextjs/,

  // 静态资源
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/,

  // 健康检查
  /\/api\/health/,
  /\/ping/,
  /\/status/,

  // 开发工具
  /\/webpack-hmr/,
  /\/__webpack_hmr/,

  // 浏览器扩展
  /chrome-extension:/,
  /moz-extension:/,
  /safari-extension:/,
];

/**
 * 采样配置
 */
export const SAMPLING_CONFIG = {
  // 错误采样率（生产环境）
  ERROR_SAMPLE_RATE: 1.0,

  // 性能采样率
  PERFORMANCE_SAMPLE_RATE: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 会话重放采样率
  REPLAY_SAMPLE_RATE: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,

  // 用户反馈采样率
  USER_FEEDBACK_SAMPLE_RATE: 1.0,
};

/**
 * 检查是否应该忽略错误
 */
export function shouldIgnoreError(error: Error, url?: string): boolean {
  const errorMessage = error.message || error.toString();

  // 检查错误消息模式
  const shouldIgnoreByMessage = IGNORED_ERROR_PATTERNS.some(pattern =>
    pattern.test(errorMessage),
  );

  if (shouldIgnoreByMessage) {
    return true;
  }

  // 检查URL模式
  if (url) {
    const shouldIgnoreByUrl = IGNORED_URL_PATTERNS.some(pattern =>
      pattern.test(url),
    );

    if (shouldIgnoreByUrl) {
      return true;
    }
  }

  return false;
}

/**
 * 获取错误分类
 */
export function categorizeError(error: Error): string {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';

  if (message.includes('network') || message.includes('fetch')) {
    return ERROR_CATEGORIES.NETWORK;
  }

  if (message.includes('validation') || message.includes('invalid')) {
    return ERROR_CATEGORIES.VALIDATION;
  }

  if (message.includes('unauthorized') || message.includes('authentication')) {
    return ERROR_CATEGORIES.AUTHENTICATION;
  }

  if (message.includes('forbidden') || message.includes('permission')) {
    return ERROR_CATEGORIES.AUTHORIZATION;
  }

  if (message.includes('database') || message.includes('sql')) {
    return ERROR_CATEGORIES.DATABASE;
  }

  if (message.includes('redis') || message.includes('cache')) {
    return ERROR_CATEGORIES.CACHE;
  }

  if (stack.includes('business') || stack.includes('service')) {
    return ERROR_CATEGORIES.BUSINESS_LOGIC;
  }

  return ERROR_CATEGORIES.SYSTEM;
}

/**
 * 获取错误严重级别
 */
export function getErrorSeverity(error: Error): string {
  const message = error.message.toLowerCase();

  // 关键错误
  if (message.includes('critical') ||
      message.includes('fatal') ||
      message.includes('crash')) {
    return ERROR_SEVERITY.CRITICAL;
  }

  // 高级错误
  if (message.includes('error') ||
      message.includes('exception') ||
      message.includes('failed')) {
    return ERROR_SEVERITY.HIGH;
  }

  // 中级错误
  if (message.includes('warning') ||
      message.includes('deprecated')) {
    return ERROR_SEVERITY.MEDIUM;
  }

  return ERROR_SEVERITY.LOW;
}

export default getMonitoringConfig;
