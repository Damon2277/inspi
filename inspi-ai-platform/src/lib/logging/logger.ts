/**
 * Winston日志器实例
 */
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { logConfig, LOG_TAGS, LogLevel } from './config';
import { 
  getDefaultTransports, 
  setupTransportEvents,
  createAccessLogTransport,
  createPerformanceLogTransport,
  createSecurityLogTransport
} from './transports';
import { LogEntry } from './formatters';

/**
 * 日志上下文接口
 */
export interface LogContext {
  traceId?: string;
  userId?: string;
  requestId?: string;
  tag?: string;
  metadata?: Record<string, any>;
  context?: Record<string, any>;
  performance?: {
    duration?: number;
    memory?: number;
    cpu?: number;
  };
}

/**
 * 创建主日志器
 */
const createMainLogger = (): winston.Logger => {
  const transports = getDefaultTransports();
  
  // 设置传输器事件处理
  transports.forEach(setupTransportEvents);
  
  const logger = winston.createLogger({
    level: logConfig.level,
    defaultMeta: {
      service: logConfig.metadata.service,
      version: logConfig.metadata.version,
      environment: logConfig.metadata.environment
    },
    transports,
    exitOnError: false,
    // 异常处理
    exceptionHandlers: [
      new winston.transports.File({ 
        filename: 'logs/exceptions.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    ],
    // 拒绝处理
    rejectionHandlers: [
      new winston.transports.File({ 
        filename: 'logs/rejections.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    ]
  });
  
  return logger;
};

/**
 * 创建专用日志器
 */
const createAccessLogger = (): winston.Logger => {
  return winston.createLogger({
    level: LogLevel.INFO,
    transports: [createAccessLogTransport()],
    exitOnError: false
  });
};

const createPerformanceLogger = (): winston.Logger => {
  return winston.createLogger({
    level: LogLevel.INFO,
    transports: [createPerformanceLogTransport()],
    exitOnError: false
  });
};

const createSecurityLogger = (): winston.Logger => {
  return winston.createLogger({
    level: LogLevel.WARN,
    transports: [createSecurityLogTransport()],
    exitOnError: false
  });
};

// 创建日志器实例
export const mainLogger = createMainLogger();
export const accessLogger = createAccessLogger();
export const performanceLogger = createPerformanceLogger();
export const securityLogger = createSecurityLogger();

/**
 * 增强的日志器类
 */
export class Logger {
  private logger: winston.Logger;
  private defaultContext: LogContext;
  
  constructor(logger: winston.Logger = mainLogger, defaultContext: LogContext = {}) {
    this.logger = logger;
    this.defaultContext = defaultContext;
  }
  
  /**
   * 创建子日志器
   */
  child(context: LogContext): Logger {
    return new Logger(this.logger, {
      ...this.defaultContext,
      ...context,
      metadata: {
        ...this.defaultContext.metadata,
        ...context.metadata
      }
    });
  }
  
  /**
   * 生成追踪ID
   */
  generateTraceId(): string {
    return uuidv4();
  }
  
  /**
   * 合并上下文
   */
  private mergeContext(context?: LogContext): LogContext {
    return {
      ...this.defaultContext,
      ...context,
      metadata: {
        ...this.defaultContext.metadata,
        ...context?.metadata
      }
    };
  }
  
  /**
   * 记录日志的通用方法
   */
  private log(level: string, message: string, context?: LogContext): void {
    const mergedContext = this.mergeContext(context);
    
    this.logger.log(level, message, {
      ...mergedContext,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 错误日志
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    } : context;
    
    this.log(LogLevel.ERROR, message, errorContext);
  }
  
  /**
   * 警告日志
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  /**
   * 信息日志
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  /**
   * HTTP日志
   */
  http(message: string, context?: LogContext): void {
    this.log(LogLevel.HTTP, message, context);
  }
  
  /**
   * 详细日志
   */
  verbose(message: string, context?: LogContext): void {
    this.log(LogLevel.VERBOSE, message, context);
  }
  
  /**
   * 调试日志
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  /**
   * 最详细日志
   */
  silly(message: string, context?: LogContext): void {
    this.log(LogLevel.SILLY, message, context);
  }
  
  /**
   * 性能日志
   */
  performance(message: string, duration: number, context?: LogContext): void {
    const perfContext = {
      ...context,
      performance: {
        duration,
        memory: process.memoryUsage().heapUsed,
        cpu: process.cpuUsage().user,
        ...context?.performance
      },
      tag: LOG_TAGS.PERFORMANCE
    };
    
    performanceLogger.info(message, perfContext);
  }
  
  /**
   * 安全日志
   */
  security(message: string, context?: LogContext): void {
    const securityContext = {
      ...context,
      tag: LOG_TAGS.SECURITY
    };
    
    securityLogger.warn(message, securityContext);
  }
  
  /**
   * 访问日志
   */
  access(method: string, url: string, status: number, responseTime: number, context?: LogContext): void {
    const accessContext = {
      ...context,
      method,
      url,
      status,
      responseTime,
      tag: LOG_TAGS.API
    };
    
    accessLogger.info(`${method} ${url} ${status} ${responseTime}ms`, accessContext);
  }
  
  /**
   * 数据库日志
   */
  database(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, {
      ...context,
      tag: LOG_TAGS.DATABASE
    });
  }
  
  /**
   * 缓存日志
   */
  cache(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, {
      ...context,
      tag: LOG_TAGS.CACHE
    });
  }
  
  /**
   * 邮件日志
   */
  email(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, {
      ...context,
      tag: LOG_TAGS.EMAIL
    });
  }
  
  /**
   * AI服务日志
   */
  ai(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, {
      ...context,
      tag: LOG_TAGS.AI
    });
  }
  
  /**
   * 用户操作日志
   */
  user(message: string, userId: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, {
      ...context,
      userId,
      tag: LOG_TAGS.USER
    });
  }
  
  /**
   * 系统日志
   */
  system(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, {
      ...context,
      tag: LOG_TAGS.SYSTEM
    });
  }
  
  /**
   * 认证日志
   */
  auth(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, {
      ...context,
      tag: LOG_TAGS.AUTH
    });
  }
}

/**
 * 默认日志器实例
 */
export const logger = new Logger(mainLogger);

/**
 * 创建带标签的日志器
 */
export const createTaggedLogger = (tag: string, context?: LogContext): Logger => {
  return new Logger(mainLogger, {
    ...context,
    tag
  });
};

/**
 * 创建带用户上下文的日志器
 */
export const createUserLogger = (userId: string, context?: LogContext): Logger => {
  return new Logger(mainLogger, {
    ...context,
    userId
  });
};

/**
 * 创建带追踪ID的日志器
 */
export const createTracedLogger = (traceId?: string, context?: LogContext): Logger => {
  return new Logger(mainLogger, {
    ...context,
    traceId: traceId || uuidv4()
  });
};

/**
 * 日志器健康检查
 */
export const checkLoggerHealth = async (): Promise<{
  healthy: boolean;
  details: Record<string, any>;
}> => {
  try {
    const details: Record<string, any> = {};
    
    // 检查主日志器
    details.mainLogger = mainLogger.transports.length > 0;
    
    // 检查专用日志器
    details.accessLogger = accessLogger.transports.length > 0;
    details.performanceLogger = performanceLogger.transports.length > 0;
    details.securityLogger = securityLogger.transports.length > 0;
    
    // 检查日志目录
    const fs = await import('fs');
    details.logDirectory = fs.existsSync('logs');
    
    const healthy = Object.values(details).every(Boolean);
    
    return { healthy, details };
  } catch (error) {
    return {
      healthy: false,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
};

/**
 * 优雅关闭日志器
 */
export const closeLoggers = async (): Promise<void> => {
  const loggers = [mainLogger, accessLogger, performanceLogger, securityLogger];
  
  await Promise.all(
    loggers.map(logger => 
      new Promise<void>((resolve) => {
        logger.end(() => resolve());
      })
    )
  );
};