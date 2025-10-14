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
type AnyRecord = Record<string | number | symbol, unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

const toNumberValue = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const sanitizeData = (data: unknown): unknown => {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (isPlainObject(data)) {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // 检查是否为敏感字段
      const isSensitive = SENSITIVE_FIELDS.some(field =>
        lowerKey.includes(field.toLowerCase()),
      );

      sanitized[key] = isSensitive ? '[REDACTED]' : sanitizeData(value);
    }

    return sanitized;
  }

  return data;
};

/**
 * 错误对象格式化
 */
const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (isPlainObject(error) && 'message' in error) {
    const message = toStringValue((error as Record<string, unknown>).message) ?? 'Unknown error';
    const normalized = new Error(message);
    const name = toStringValue((error as Record<string, unknown>).name);
    if (name) {
      normalized.name = name;
    }
    const stack = toStringValue((error as Record<string, unknown>).stack);
    if (stack) {
      normalized.stack = stack;
    }
    const code = toStringValue((error as Record<string, unknown>).code);
    if (code) {
      (normalized as Error & { code?: string }).code = code;
    }
    return normalized;
  }

  return new Error(toStringValue(error) ?? 'Unknown error');
};

const formatError = (error: unknown): LogEntry['error'] => {
  const normalized = normalizeError(error);
  return {
    name: normalized.name,
    message: normalized.message,
    stack: normalized.stack,
    code: (normalized as Error & { code?: string }).code,
  };
};

/**
 * 性能信息格式化
 */
const formatPerformance = (performance?: unknown): LogEntry['performance'] | undefined => {
  if (!performance || !isPlainObject(performance)) return undefined;

  const duration = toNumberValue(performance.duration) ?? 0;

  return {
    duration,
    memory: process.memoryUsage().heapUsed,
    cpu: process.cpuUsage().user,
  };
};

/**
 * JSON格式化器
 */
export const jsonFormatter = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const timestamp = toStringValue(info.timestamp) ?? new Date().toISOString();
    const level = toStringValue(info.level) ?? 'info';
    const message = toStringValue(info.message) ?? '';
    const traceId = toStringValue(info.traceId);
    const userId = toStringValue(info.userId);
    const requestId = toStringValue(info.requestId);
    const tag = toStringValue(info.tag);

    const baseMetadata: LogEntry['metadata'] = {
      service: toStringValue((info as AnyRecord).service) ?? 'inspi-ai-platform',
      version: toStringValue((info as AnyRecord).version) ?? '0.1.0',
      environment: toStringValue((info as AnyRecord).environment) ?? process.env.NODE_ENV ?? 'development',
    };

    const metadataSource = isPlainObject(info.metadata) ? info.metadata : {};
    const sanitizedMetadata = sanitizeData(metadataSource);
    if (isPlainObject(sanitizedMetadata)) {
      Object.assign(baseMetadata, sanitizedMetadata);
    }

    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      traceId,
      userId,
      requestId,
      tag,
      metadata: baseMetadata,
    };

    // 添加错误信息
    const errorInfo = info.error ?? (info instanceof Error ? info : undefined);
    if (errorInfo) {
      logEntry.error = formatError(errorInfo);
    }

    // 添加性能信息
    if (info.performance) {
      logEntry.performance = formatPerformance(info.performance);
    }

    // 添加上下文信息
    if (info.context) {
      const sanitizedContext = sanitizeData(info.context);
      if (isPlainObject(sanitizedContext)) {
        logEntry.context = sanitizedContext;
      }
    }

    // 添加其他自定义字段
    const customFields: AnyRecord = { ...info } as AnyRecord;
    const keysToRemove = [
      'timestamp',
      'level',
      'message',
      'traceId',
      'userId',
      'requestId',
      'tag',
      'metadata',
      'error',
      'performance',
      'context',
      'service',
      'version',
      'environment',
    ];
    keysToRemove.forEach(key => {
      if (key in customFields) {
        delete customFields[key];
      }
    });

    const symbolKeys = [Symbol.for('level'), Symbol.for('message'), Symbol.for('splat')];
    symbolKeys.forEach(symbolKey => {
      if (Object.prototype.hasOwnProperty.call(customFields, symbolKey)) {
        delete customFields[symbolKey];
      }
    });

    const stringCustomFields: Record<string, unknown> = {};
    Object.entries(customFields).forEach(([key, value]) => {
      if (typeof key === 'string') {
        stringCustomFields[key] = value;
      }
    });

    if (Object.keys(stringCustomFields).length > 0) {
      const sanitizedCustomFields = sanitizeData(stringCustomFields);
      if (isPlainObject(sanitizedCustomFields)) {
        logEntry.metadata = {
          ...logEntry.metadata,
          ...sanitizedCustomFields,
        };
      }
    }

    return JSON.stringify(logEntry);
  }),
);

/**
 * 控制台格式化器（开发环境）
 */
export const consoleFormatter = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS',
  }),
  winston.format.colorize(),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const timestamp = toStringValue(info.timestamp);
    const level = toStringValue(info.level) ?? 'info';
    let output = timestamp ? `${timestamp} [${level}]` : `[${level}]`;

    // 添加标签
    const tag = toStringValue(info.tag);
    if (tag) {
      output += ` [${tag}]`;
    }

    // 添加追踪ID
    const traceId = toStringValue(info.traceId);
    if (traceId) {
      output += ` [${traceId.substring(0, 8)}]`;
    }

    // 添加用户ID
    const userId = toStringValue(info.userId);
    if (userId) {
      output += ` [user:${userId}]`;
    }

    const message = toStringValue(info.message) ?? '';
    output += `: ${message}`;

    // 添加错误堆栈
    const stack = toStringValue((info as AnyRecord).stack);
    if (stack) {
      output += `\n${stack}`;
    }

    // 添加元数据（开发环境显示）
    if (isPlainObject(info.metadata) && Object.keys(info.metadata).length > 0) {
      output += `\n  Metadata: ${JSON.stringify(sanitizeData(info.metadata), null, 2)}`;
    }

    // 添加上下文信息
    if (isPlainObject(info.context) && Object.keys(info.context).length > 0) {
      output += `\n  Context: ${JSON.stringify(sanitizeData(info.context), null, 2)}`;
    }

    return output;
  }),
);

/**
 * 简单格式化器（用于文件日志）
 */
export const simpleFormatter = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const timestamp = toStringValue(info.timestamp) ?? new Date().toISOString();
    const level = (toStringValue(info.level) ?? 'info').toUpperCase();
    let output = `${timestamp} [${level}]`;

    const tag = toStringValue(info.tag);
    if (tag) {
      output += ` [${tag}]`;
    }

    const traceId = toStringValue(info.traceId);
    if (traceId) {
      output += ` [${traceId}]`;
    }

    const message = toStringValue(info.message) ?? '';
    output += `: ${message}`;

    const stack = toStringValue((info as AnyRecord).stack);
    if (stack) {
      output += `\n${stack}`;
    }

    return output;
  }),
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
    format = 'json',
  } = options;

  const formats = [
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS',
    }),
    winston.format.errors({ stack: true }),
  ];

  if (colorize) {
    formats.push(winston.format.colorize());
  }

  formats.push(
    winston.format.printf((info) => {
      if (format === 'json') {
        const logEntry: Partial<LogEntry> = {
          timestamp: toStringValue(info.timestamp) ?? new Date().toISOString(),
          level: toStringValue(info.level) ?? 'info',
          message: toStringValue(info.message) ?? '',
          traceId: toStringValue(info.traceId),
          userId: toStringValue(info.userId),
          requestId: toStringValue(info.requestId),
          tag: toStringValue(info.tag),
        };

        const metadataBase: LogEntry['metadata'] = {
          service: toStringValue((info as AnyRecord).service) ?? 'inspi-ai-platform',
          version: toStringValue((info as AnyRecord).version) ?? '0.1.0',
          environment: toStringValue((info as AnyRecord).environment) ?? process.env.NODE_ENV ?? 'development',
        };

        logEntry.metadata = metadataBase;

        if (includeMetadata && info.metadata) {
          const sanitizedMetadata = sanitizeData(info.metadata);
          if (isPlainObject(sanitizedMetadata)) {
            logEntry.metadata = {
              ...metadataBase,
              ...sanitizedMetadata,
            };
          }
        }

        if (includeContext && info.context) {
          const sanitizedContext = sanitizeData(info.context);
          if (isPlainObject(sanitizedContext)) {
            logEntry.context = sanitizedContext;
          }
        }

        if (includePerformance && info.performance) {
          logEntry.performance = formatPerformance(info.performance);
        }

        const errorInfo = info.error ?? (info instanceof Error ? info : undefined);
        if (errorInfo) {
          logEntry.error = formatError(errorInfo);
        }

        return JSON.stringify(logEntry);
      }

      // 简单格式
      const timestamp = toStringValue(info.timestamp) ?? new Date().toISOString();
      const level = (toStringValue(info.level) ?? 'info').toUpperCase();
      let output = `${timestamp} [${level}]`;

      const tag = toStringValue(info.tag);
      if (tag) {
        output += ` [${tag}]`;
      }

      const traceId = toStringValue(info.traceId);
      if (traceId) {
        output += ` [${traceId.substring(0, 8)}]`;
      }

      const message = toStringValue(info.message) ?? '';
      output += `: ${message}`;

      const stack = toStringValue((info as AnyRecord).stack);
      if (stack) {
        output += `\n${stack}`;
      }

      return output;
    }),
  );

  return winston.format.combine(...formats);
};
