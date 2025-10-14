/**
 * Sentry错误监控配置
 * 注意：需要安装 @sentry/nextjs @sentry/node @sentry/react
 */

// 模拟Sentry接口，实际使用时需要安装真实的Sentry包
interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  debug: boolean;
  beforeSend?: (event: any) => any;
  beforeSendTransaction?: (event: any) => any;
}

interface SentryUser {
  id?: string;
  email?: string;
  username?: string;
  ip_address?: string;
}

interface SentryContext {
  [key: string]: any;
}

interface SentryBreadcrumb {
  message: string;
  category?: string;
  level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  data?: any;
  timestamp?: number;
}

/**
 * Sentry监控管理器
 */
class SentryManager {
  private isInitialized = false;
  private config: SentryConfig | null = null;

  /**
   * 初始化Sentry
   */
  init(config: SentryConfig) {
    this.config = config;
    this.isInitialized = true;

    // 实际使用时的代码：
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.init({
    //   dsn: config.dsn,
    //   environment: config.environment,
    //   tracesSampleRate: config.tracesSampleRate,
    //   debug: config.debug,
    //   beforeSend: config.beforeSend,
    //   beforeSendTransaction: config.beforeSendTransaction,
    //   integrations: [
    //     new Sentry.BrowserTracing(),
    //     new Sentry.Replay({
    //       maskAllText: true,
    //       blockAllMedia: true,
    //     }),
    //   ],
    // });

    console.log('Sentry initialized (mock)', config);
  }

  /**
   * 捕获错误
   */
  captureError(error: Error, context?: SentryContext) {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }

    // 实际使用时的代码：
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.captureException(error, {
    //   contexts: context,
    // });

    console.error('Sentry captureError (mock):', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
    });
  }

  /**
   * 捕获消息
   */
  captureMessage(message: string, level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info') {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }

    // 实际使用时的代码：
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.captureMessage(message, level);

    console.log(`Sentry captureMessage (mock) [${level}]:`, message);
  }

  /**
   * 设置用户上下文
   */
  setUser(user: SentryUser) {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }

    // 实际使用时的代码：
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.setUser(user);

    console.log('Sentry setUser (mock):', user);
  }

  /**
   * 设置标签
   */
  setTag(key: string, value: string) {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }

    // 实际使用时的代码：
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.setTag(key, value);

    console.log(`Sentry setTag (mock): ${key} = ${value}`);
  }

  /**
   * 设置上下文
   */
  setContext(key: string, context: SentryContext) {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }

    // 实际使用时的代码：
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.setContext(key, context);

    console.log(`Sentry setContext (mock): ${key}`, context);
  }

  /**
   * 添加面包屑
   */
  addBreadcrumb(breadcrumb: SentryBreadcrumb) {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }

    // 实际使用时的代码：
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.addBreadcrumb(breadcrumb);

    console.log('Sentry addBreadcrumb (mock):', breadcrumb);
  }

  /**
   * 开始事务
   */
  startTransaction(name: string, op: string) {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return null;
    }

    // 实际使用时的代码：
    // import * as Sentry from '@sentry/nextjs';
    // return Sentry.startTransaction({ name, op });

    console.log(`Sentry startTransaction (mock): ${name} [${op}]`);
    return {
      setTag: (key: string, value: string) => console.log(`Transaction setTag: ${key} = ${value}`),
      setData: (key: string, value: any) => console.log(`Transaction setData: ${key}`, value),
      finish: () => console.log('Transaction finished'),
    };
  }

  /**
   * 配置作用域
   */
  configureScope(callback: (scope: any) => void) {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized');
      return;
    }

    // 实际使用时的代码：
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.configureScope(callback);

    const mockScope = {
      setUser: this.setUser.bind(this),
      setTag: this.setTag.bind(this),
      setContext: this.setContext.bind(this),
      addBreadcrumb: this.addBreadcrumb.bind(this),
    };

    callback(mockScope);
  }
}

// 创建全局Sentry实例
export const sentry = new SentryManager();

/**
 * 获取Sentry配置
 */
export function getSentryConfig(): SentryConfig {
  return {
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
    beforeSend: (event) => {
      // 过滤敏感信息
      if (event.exception) {
        const exception = event.exception.values?.[0];
        if (exception?.value?.includes('password') ||
            exception?.value?.includes('token') ||
            exception?.value?.includes('secret')) {
          return null; // 不发送包含敏感信息的错误
        }
      }
      return event;
    },
    beforeSendTransaction: (event) => {
      // 过滤不需要的事务
      if (event.transaction?.includes('/_next/') ||
          event.transaction?.includes('/api/health')) {
        return null;
      }
      return event;
    },
  };
}

/**
 * 初始化Sentry监控
 */
export function initSentry() {
  const config = getSentryConfig();

  if (!config.dsn && process.env.NODE_ENV === 'production') {
    console.warn('Sentry DSN not configured for production');
    return;
  }

  sentry.init(config);
}

/**
 * 错误过滤器
 */
export function shouldReportError(error: Error): boolean {
  // 不报告的错误类型
  const ignoredErrors = [
    'ChunkLoadError',
    'Loading chunk',
    'Loading CSS chunk',
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Network request failed',
  ];

  const errorMessage = error.message || error.toString();

  return !ignoredErrors.some(ignored =>
    errorMessage.includes(ignored),
  );
}

/**
 * 设置用户上下文
 */
export function setSentryUser(user: {
  id?: string;
  email?: string;
  username?: string;
}) {
  sentry.setUser({
    id: (user.id || (user as any)._id),
    email: user.email,
    username: user.username,
    ip_address: '{{auto}}', // Sentry自动获取IP
  });
}

/**
 * 设置请求上下文
 */
export function setSentryRequestContext(req: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  userAgent?: string;
}) {
  sentry.setContext('request', {
    url: req.url,
    method: req.method,
    headers: {
      'user-agent': req.userAgent,
      'accept-language': req.headers?.['accept-language'],
      'referer': req.headers?.['referer'],
    },
  });
}

/**
 * 报告错误到Sentry
 */
export function reportError(error: Error, context?: {
  user?: any;
  extra?: Record<string, any>;
  tags?: Record<string, string>;
  level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
}) {
  if (!shouldReportError(error)) {
    return;
  }

  sentry.configureScope((scope) => {
    if (context?.user) {
      scope.setUser(context.user);
    }

    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      scope.setContext('extra', context.extra);
    }
  });

  sentry.captureError(error);
}

/**
 * 性能监控装饰器
 */
export function withSentryPerformance<T extends(...args: any[]) => any>(
  fn: T,
  transactionName: string,
  op: string = 'function',
): T {
  return ((...args: any[]) => {
    const transaction = sentry.startTransaction(transactionName, op);

    try {
      const result = fn(...args);

      if (result instanceof Promise) {
        return result
          .then((res) => {
            transaction?.finish();
            return res;
          })
          .catch((error) => {
            sentry.captureError(error);
            transaction?.finish();
            throw error;
          });
      }

      transaction?.finish();
      return result;
    } catch (error) {
      sentry.captureError(error instanceof Error ? error : new Error(String(error)));
      transaction?.finish();
      throw error;
    }
  }) as T;
}

export default sentry;
