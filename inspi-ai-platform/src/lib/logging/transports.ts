/**
 * 日志传输器配置
 */
import winston from 'winston';
import { logConfig, LogLevel } from './config';
import { jsonFormatter, consoleFormatter, simpleFormatter } from './formatters';
import path from 'path';
import fs from 'fs';

/**
 * 确保日志目录存在
 */
const ensureLogDirectory = (logPath: string): void => {
  const dir = path.dirname(logPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * 创建控制台传输器
 */
export const createConsoleTransport = (): winston.transports.ConsoleTransportInstance => {
  return new winston.transports.Console({
    level: logConfig.transports.console.level,
    format: logConfig.transports.console.colorize ? consoleFormatter : simpleFormatter,
    silent: !logConfig.transports.console.enabled
  });
};

/**
 * 创建文件传输器
 */
export const createFileTransport = (): winston.transport => {
  const filename = logConfig.transports.file.filename;
  ensureLogDirectory(filename);
  
  try {
    // 尝试使用 winston-daily-rotate-file
    const DailyRotateFile = require('winston-daily-rotate-file');
    
    return new DailyRotateFile({
      level: logConfig.transports.file.level,
      filename: filename,
      datePattern: logConfig.transports.file.datePattern,
      maxSize: logConfig.transports.file.maxSize,
      maxFiles: logConfig.transports.file.maxFiles,
      format: jsonFormatter,
      silent: !logConfig.transports.file.enabled,
      auditFile: 'logs/.audit/app-audit.json',
      createSymlink: true,
      symlinkName: 'logs/app-current.log'
    });
  } catch (error) {
    // 回退到标准文件传输器
    console.warn('winston-daily-rotate-file not available, using standard File transport');
    
    return new winston.transports.File({
      level: logConfig.transports.file.level,
      filename: filename.replace('-%DATE%', ''),
      format: jsonFormatter,
      silent: !logConfig.transports.file.enabled,
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5
    });
  }
};

/**
 * 创建错误文件传输器
 */
export const createErrorFileTransport = (): winston.transport => {
  const filename = logConfig.transports.error.filename;
  ensureLogDirectory(filename);
  
  try {
    // 尝试使用 winston-daily-rotate-file
    const DailyRotateFile = require('winston-daily-rotate-file');
    
    return new DailyRotateFile({
      level: logConfig.transports.error.level,
      filename: filename,
      datePattern: logConfig.transports.error.datePattern,
      maxSize: logConfig.transports.error.maxSize,
      maxFiles: logConfig.transports.error.maxFiles,
      format: jsonFormatter,
      silent: !logConfig.transports.error.enabled,
      auditFile: 'logs/.audit/error-audit.json',
      createSymlink: true,
      symlinkName: 'logs/error-current.log'
    });
  } catch (error) {
    // 回退到标准文件传输器
    return new winston.transports.File({
      level: logConfig.transports.error.level,
      filename: filename.replace('-%DATE%', ''),
      format: jsonFormatter,
      silent: !logConfig.transports.error.enabled,
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5
    });
  }
};

/**
 * 创建访问日志传输器
 */
export const createAccessLogTransport = (): winston.transport => {
  const filename = 'logs/access-%DATE%.log';
  ensureLogDirectory(filename);
  
  try {
    const DailyRotateFile = require('winston-daily-rotate-file');
    
    return new DailyRotateFile({
      level: LogLevel.INFO,
      filename: filename,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((info) => {
          // 访问日志格式：Common Log Format (CLF)
          const { timestamp, method, url, status, responseTime, userAgent, ip, userId } = info;
          return `${ip || '-'} - ${userId || '-'} [${timestamp}] "${method} ${url}" ${status} ${responseTime}ms "${userAgent || '-'}"`;
        })
      ),
      auditFile: 'logs/.audit/access-audit.json',
      createSymlink: true,
      symlinkName: 'logs/access-current.log'
    });
  } catch (error) {
    return new winston.transports.File({
      level: LogLevel.INFO,
      filename: filename.replace('-%DATE%', ''),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((info) => {
          const { timestamp, method, url, status, responseTime, userAgent, ip, userId } = info;
          return `${ip || '-'} - ${userId || '-'} [${timestamp}] "${method} ${url}" ${status} ${responseTime}ms "${userAgent || '-'}"`;
        })
      ),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 5
    });
  }
};

/**
 * 创建性能日志传输器
 */
export const createPerformanceLogTransport = (): winston.transport => {
  const filename = 'logs/performance-%DATE%.log';
  ensureLogDirectory(filename);
  
  try {
    const DailyRotateFile = require('winston-daily-rotate-file');
    
    return new DailyRotateFile({
      level: LogLevel.INFO,
      filename: filename,
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '7d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      auditFile: 'logs/.audit/performance-audit.json',
      createSymlink: true,
      symlinkName: 'logs/performance-current.log'
    });
  } catch (error) {
    return new winston.transports.File({
      level: LogLevel.INFO,
      filename: filename.replace('-%DATE%', ''),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    });
  }
};

/**
 * 创建安全日志传输器
 */
export const createSecurityLogTransport = (): winston.transport => {
  const filename = 'logs/security-%DATE%.log';
  ensureLogDirectory(filename);
  
  try {
    const DailyRotateFile = require('winston-daily-rotate-file');
    
    return new DailyRotateFile({
      level: LogLevel.WARN,
      filename: filename,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d', // 安全日志保留更长时间
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      auditFile: 'logs/.audit/security-audit.json',
      createSymlink: true,
      symlinkName: 'logs/security-current.log'
    });
  } catch (error) {
    return new winston.transports.File({
      level: LogLevel.WARN,
      filename: filename.replace('-%DATE%', ''),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 10
    });
  }
};

/**
 * 创建自定义传输器
 */
export const createCustomTransport = (options: {
  name: string;
  level?: string;
  filename?: string;
  maxSize?: string;
  maxFiles?: string;
  datePattern?: string;
  format?: winston.Logform.Format;
}): winston.transport => {
  const {
    name,
    level = LogLevel.INFO,
    filename = `logs/${name}-%DATE%.log`,
    maxSize = '20m',
    maxFiles = '14d',
    datePattern = 'YYYY-MM-DD',
    format = jsonFormatter
  } = options;
  
  ensureLogDirectory(filename);
  
  try {
    const DailyRotateFile = require('winston-daily-rotate-file');
    
    return new DailyRotateFile({
      level,
      filename,
      datePattern,
      maxSize,
      maxFiles,
      format,
      auditFile: `logs/.audit/${name}-audit.json`,
      createSymlink: true,
      symlinkName: `logs/${name}-current.log`
    });
  } catch (error) {
    return new winston.transports.File({
      level,
      filename: filename.replace('-%DATE%', ''),
      format,
      maxsize: 20 * 1024 * 1024,
      maxFiles: 5
    });
  }
};

/**
 * 获取所有默认传输器
 */
export const getDefaultTransports = (): winston.transport[] => {
  const transports: winston.transport[] = [];
  
  // 控制台传输器
  if (logConfig.transports.console.enabled) {
    transports.push(createConsoleTransport());
  }
  
  // 文件传输器
  if (logConfig.transports.file.enabled) {
    transports.push(createFileTransport());
  }
  
  // 错误文件传输器
  if (logConfig.transports.error.enabled) {
    transports.push(createErrorFileTransport());
  }
  
  return transports;
};

/**
 * 传输器事件处理
 */
export const setupTransportEvents = (transport: winston.transport): void => {
  try {
    const DailyRotateFile = require('winston-daily-rotate-file');
    
    if (transport instanceof DailyRotateFile) {
      // 文件轮转事件
      transport.on('rotate', (oldFilename, newFilename) => {
        console.log(`Log file rotated: ${oldFilename} -> ${newFilename}`);
      });
      
      // 文件归档事件
      transport.on('archive', (zipFilename) => {
        console.log(`Log file archived: ${zipFilename}`);
      });
      
      // 文件删除事件
      transport.on('logRemoved', (removedFilename) => {
        console.log(`Old log file removed: ${removedFilename}`);
      });
      
      // 错误事件
      transport.on('error', (error) => {
        console.error('Log transport error:', error);
      });
    }
  } catch (error) {
    // DailyRotateFile not available, skip event setup
  }
  
  // 通用错误事件处理
  if (transport.on) {
    transport.on('error', (error) => {
      console.error('Log transport error:', error);
    });
  }
};

/**
 * 传输器健康检查
 */
export const checkTransportHealth = async (transport: winston.transport): Promise<boolean> => {
  try {
    if (transport instanceof winston.transports.Console) {
      return true; // 控制台传输器总是健康的
    }
    
    if (transport instanceof winston.transports.File) {
      // 检查文件是否可写
      const filename = (transport as any).filename;
      if (filename) {
        const dir = path.dirname(filename);
        try {
          fs.accessSync(dir, fs.constants.W_OK);
          return true;
        } catch {
          return false;
        }
      }
    }
    
    try {
      const DailyRotateFile = require('winston-daily-rotate-file');
      if (transport instanceof DailyRotateFile) {
        // 检查文件是否可写
        const filename = (transport as any).filename;
        if (filename) {
          const dir = path.dirname(filename);
          try {
            fs.accessSync(dir, fs.constants.W_OK);
            return true;
          } catch {
            return false;
          }
        }
      }
    } catch (error) {
      // DailyRotateFile not available
    }
    
    return true;
  } catch (error) {
    console.error('Transport health check failed:', error);
    return false;
  }
};

/**
 * 清理旧日志文件
 */
export const cleanupOldLogs = (directory: string, maxAge: number = 30): void => {
  try {
    if (!fs.existsSync(directory)) {
      return;
    }
    
    const files = fs.readdirSync(directory);
    const now = Date.now();
    const maxAgeMs = maxAge * 24 * 60 * 60 * 1000; // 转换为毫秒
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old log file: ${filePath}`);
      }
    });
  } catch (error) {
    console.error('Failed to cleanup old logs:', error);
  }
};