/**
 * 日志系统配置
 */

export interface LogConfig {
  level: string;
  format: string;
  transports: {
    console: {
      enabled: boolean;
      level: string;
      colorize: boolean;
    };
    file: {
      enabled: boolean;
      level: string;
      filename: string;
      maxSize: string;
      maxFiles: string;
      datePattern: string;
    };
    error: {
      enabled: boolean;
      level: string;
      filename: string;
      maxSize: string;
      maxFiles: string;
      datePattern: string;
    };
  };
  metadata: {
    service: string;
    version: string;
    environment: string;
  };
}

/**
 * 日志级别定义
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

/**
 * 环境配置
 */
const getEnvironmentConfig = (): Partial<LogConfig> => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        level: LogLevel.INFO,
        transports: {
          console: {
            enabled: false,
            level: LogLevel.ERROR,
            colorize: false
          },
          file: {
            enabled: true,
            level: LogLevel.INFO,
            filename: 'logs/app-%DATE%.log',
            maxSize: '20m',
            maxFiles: '14d',
            datePattern: 'YYYY-MM-DD'
          },
          error: {
            enabled: true,
            level: LogLevel.ERROR,
            filename: 'logs/error-%DATE%.log',
            maxSize: '20m',
            maxFiles: '30d',
            datePattern: 'YYYY-MM-DD'
          }
        }
      };
    
    case 'test':
      return {
        level: LogLevel.ERROR,
        transports: {
          console: {
            enabled: false,
            level: LogLevel.ERROR,
            colorize: false
          },
          file: {
            enabled: false,
            level: LogLevel.ERROR,
            filename: 'logs/test-%DATE%.log',
            maxSize: '10m',
            maxFiles: '3d',
            datePattern: 'YYYY-MM-DD'
          },
          error: {
            enabled: false,
            level: LogLevel.ERROR,
            filename: 'logs/test-error-%DATE%.log',
            maxSize: '10m',
            maxFiles: '3d',
            datePattern: 'YYYY-MM-DD'
          }
        }
      };
    
    case 'development':
    default:
      return {
        level: LogLevel.DEBUG,
        transports: {
          console: {
            enabled: true,
            level: LogLevel.DEBUG,
            colorize: true
          },
          file: {
            enabled: true,
            level: LogLevel.DEBUG,
            filename: 'logs/dev-%DATE%.log',
            maxSize: '10m',
            maxFiles: '7d',
            datePattern: 'YYYY-MM-DD'
          },
          error: {
            enabled: true,
            level: LogLevel.ERROR,
            filename: 'logs/dev-error-%DATE%.log',
            maxSize: '10m',
            maxFiles: '7d',
            datePattern: 'YYYY-MM-DD'
          }
        }
      };
  }
};

/**
 * 默认日志配置
 */
const defaultConfig: LogConfig = {
  level: LogLevel.INFO,
  format: 'json',
  transports: {
    console: {
      enabled: true,
      level: LogLevel.INFO,
      colorize: true
    },
    file: {
      enabled: true,
      level: LogLevel.INFO,
      filename: 'logs/app-%DATE%.log',
      maxSize: '20m',
      maxFiles: '14d',
      datePattern: 'YYYY-MM-DD'
    },
    error: {
      enabled: true,
      level: LogLevel.ERROR,
      filename: 'logs/error-%DATE%.log',
      maxSize: '20m',
      maxFiles: '30d',
      datePattern: 'YYYY-MM-DD'
    }
  },
  metadata: {
    service: 'inspi-ai-platform',
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development'
  }
};

/**
 * 合并配置
 */
export const logConfig: LogConfig = {
  ...defaultConfig,
  ...getEnvironmentConfig(),
  metadata: {
    ...defaultConfig.metadata,
    ...getEnvironmentConfig().metadata
  }
};

/**
 * 日志文件路径配置
 */
export const LOG_PATHS = {
  APP: 'logs/app',
  ERROR: 'logs/error',
  ACCESS: 'logs/access',
  PERFORMANCE: 'logs/performance',
  SECURITY: 'logs/security'
} as const;

/**
 * 日志标签定义
 */
export const LOG_TAGS = {
  AUTH: 'auth',
  API: 'api',
  DATABASE: 'database',
  CACHE: 'cache',
  EMAIL: 'email',
  AI: 'ai',
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  USER: 'user',
  SYSTEM: 'system'
} as const;

/**
 * 敏感信息字段（需要脱敏）
 */
export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'cookie',
  'session',
  'email',
  'phone',
  'address',
  'creditCard',
  'ssn'
] as const;

/**
 * 获取日志配置
 */
export const getLogConfig = (): LogConfig => logConfig;

/**
 * 验证日志配置
 */
export const validateLogConfig = (config: LogConfig): boolean => {
  try {
    // 验证必要字段
    if (!config.level || !config.format) {
      return false;
    }
    
    // 验证日志级别
    if (!Object.values(LogLevel).includes(config.level as LogLevel)) {
      return false;
    }
    
    // 验证传输器配置
    if (!config.transports) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};