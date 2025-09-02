/**
 * 日志格式化器
 */
import winston from 'winston';
import { SENSITIVE_FIELDS } from './config';

/**
 * 日志条目接口
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  traceId?: string;
  userId?: string;
  requestId?: string;
  tag?: string;
  metadata: {
    service: string;
    version: string;
    environment: string;
    [key: string]: any;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration: number;
    memory: number;
    cpu: number;
  };
  context?: {
    url?: string;
    method?: string;
    userAgent?: string;
    ip?: string;
    [key: string]: any;
  };
}

/**
 * 脱敏处理函数
 */
const sanitizeData = (data: any): any => {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'string') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // 检查是否为敏感字段
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        lowerKey.includes(field.toLowerCase())
      );
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    
    return sanitized;
  }
  
  return data;
};

/**
 * 错误对象格式化
 */
const formatError = (error: Error): LogEntry['error'] => {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: (error as any).code
  };
};

/**
 * 性能信息格式化
 */
const formatPerformance = (performance?: any): LogEntry['performance'] | undefined => {
  if (!performance) return undefined;
  
  return {
    duration: performance.duration || 0,
    memory: process.memoryUsage().heapUsed,
    cpu: process.cpuUsage().user
  };
};

/**
 * JSON格式化器
 */
export const jsonFormatter = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const logEntry: LogEntry = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      traceId: info.traceId,
      userId: info.userId,
      requestId: info.requestId,
      tag: info.tag,
      metadata: {
        service: info.service || 'inspi-ai-platform',
        version: info.version || '0.1.0',
        environment: info.environment || process.env.NODE_ENV || 'development',
        ...sanitizeData(info.metadata || {})
      }
    };
    
    // 添加错误信息
    if (info.error || info instanceof Error) {
      logEntry.error = formatError(info.error || info);
    }
    
    // 添加性能信息
    if (info.performance) {
      logEntry.performance = formatPerformance(info.performance);
    }
    
    // 添加上下文信息
    if (info.context) {
      logEntry.context = sanitizeData(info.context);
    }
    
    // 添加其他自定义字段
    const customFields = { ...info };
    delete customFields.timestamp;
    delete customFields.level;
    delete customFields.message;
    delete customFields.traceId;
    delete customFields.userId;
    delete customFields.requestId;
    delete customFields.tag;
    delete customFields.metadata;
    delete customFields.error;
    delete customFields.performance;
    delete customFields.context;
    delete customFields.service;
    delete customFields.version;
    delete customFields.environment;
    delete customFields[Symbol.for('level')];
    delete customFields[Symbol.for('message')];
    delete customFields[Symbol.for('splat')];
    
    if (Object.keys(customFields).length > 0) {
      logEntry.metadata = {
        ...logEntry.metadata,
        ...sanitizeData(customFields)
      };
    }
    
    return JSON.stringify(logEntry);
  })
);

/**
 * 控制台格式化器（开发环境）
 */
export const consoleFormatter = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS'
  }),
  winston.format.colorize(),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    let output = `${info.timestamp} [${info.level}]`;
    
    // 添加标签
    if (info.tag) {
      output += ` [${info.tag}]`;
    }
    
    // 添加追踪ID
    if (info.traceId) {
      output += ` [${info.traceId.substring(0, 8)}]`;
    }
    
    // 添加用户ID
    if (info.userId) {
      output += ` [user:${info.userId}]`;
    }
    
    output += `: ${info.message}`;
    
    // 添加错误堆栈
    if (info.stack) {
      output += `\n${info.stack}`;
    }
    
    // 添加元数据（开发环境显示）
    if (info.metadata && Object.keys(info.metadata).length > 0) {
      output += `\n  Metadata: ${JSON.stringify(sanitizeData(info.metadata), null, 2)}`;
    }
    
    // 添加上下文信息
    if (info.context && Object.keys(info.context).length > 0) {
      output += `\n  Context: ${JSON.stringify(sanitizeData(info.context), null, 2)}`;
    }
    
    return output;
  })
);

/**
 * 简单格式化器（用于文件日志）
 */
export const simpleFormatter = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    let output = `${info.timestamp} [${info.level.toUpperCase()}]`;
    
    if (info.tag) {
      output += ` [${info.tag}]`;
    }
    
    if (info.traceId) {
      output += ` [${info.traceId}]`;
    }
    
    output += `: ${info.message}`;
    
    if (info.stack) {
      output += `\n${info.stack}`;
    }
    
    return output;
  })
);

/**
 * 创建自定义格式化器
 */
export const createCustomFormatter = (options: {
  includeMetadata?: boolean;
  includeContext?: boolean;
  includePerformance?: boolean;
  colorize?: boolean;
  format?: 'json' | 'simple' | 'detailed';
}) => {
  const {
    includeMetadata = true,
    includeContext = true,
    includePerformance = false,
    colorize = false,
    format = 'json'
  } = options;
  
  const formats = [
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true })
  ];
  
  if (colorize) {
    formats.push(winston.format.colorize());
  }
  
  formats.push(
    winston.format.printf((info) => {
      if (format === 'json') {
        const logEntry: Partial<LogEntry> = {
          timestamp: info.timestamp,
          level: info.level,
          message: info.message,
          traceId: info.traceId,
          userId: info.userId,
          requestId: info.requestId,
          tag: info.tag
        };
        
        if (includeMetadata && info.metadata) {
          logEntry.metadata = sanitizeData(info.metadata);
        }
        
        if (includeContext && info.context) {
          logEntry.context = sanitizeData(info.context);
        }
        
        if (includePerformance && info.performance) {
          logEntry.performance = formatPerformance(info.performance);
        }
        
        if (info.error || info instanceof Error) {
          logEntry.error = formatError(info.error || info);
        }
        
        return JSON.stringify(logEntry);
      }
      
      // 简单格式
      let output = `${info.timestamp} [${info.level.toUpperCase()}]`;
      
      if (info.tag) {
        output += ` [${info.tag}]`;
      }
      
      if (info.traceId) {
        output += ` [${info.traceId.substring(0, 8)}]`;
      }
      
      output += `: ${info.message}`;
      
      if (info.stack) {
        output += `\n${info.stack}`;
      }
      
      return output;
    })
  );
  
  return winston.format.combine(...formats);
};