import fs from 'fs';
import path from 'path';

import { Logger } from '@/shared/utils/logger';

// Mock fs module
jest.mock('fs');
jest.mock('path');

describe('Logger', () => {
  let logger: Logger;
  let mockFs: jest.Mocked<typeof fs>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs = fs as jest.Mocked<typeof fs>;
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Mock environment
    process.env.NODE_ENV = 'development';
    process.env.LOG_LEVEL = 'info';

    logger = new Logger();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      // Act
      const defaultLogger = new Logger();

      // Assert
      expect(defaultLogger.getLevel()).toBe('info');
      expect(defaultLogger.isEnabled()).toBe(true);
    });

    it('should initialize with custom configuration', () => {
      // Arrange
      const config = {
        level: 'debug' as const,
        enableConsole: false,
        enableFile: true,
        logDir: '/custom/logs',
      };

      // Act
      const customLogger = new Logger(config);

      // Assert
      expect(customLogger.getLevel()).toBe('debug');
    });

    it('should create log directory if it does not exist', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation();

      // Act
      new Logger({ enableFile: true, logDir: '/test/logs' });

      // Assert
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/logs', { recursive: true });
    });
  });

  describe('log levels', () => {
    it('should log debug messages when level is debug', () => {
      // Arrange
      logger.setLevel('debug');

      // Act
      logger.debug('Debug message');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('Debug message'),
      );
    });

    it('should log info messages when level is info or lower', () => {
      // Arrange
      logger.setLevel('info');

      // Act
      logger.info('Info message');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('Info message'),
      );
    });

    it('should log warn messages when level is warn or lower', () => {
      // Arrange
      logger.setLevel('warn');

      // Act
      logger.warn('Warning message');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        expect.stringContaining('Warning message'),
      );
    });

    it('should log error messages at all levels', () => {
      // Arrange
      logger.setLevel('error');

      // Act
      logger.error('Error message');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('Error message'),
      );
    });

    it('should not log debug messages when level is info', () => {
      // Arrange
      logger.setLevel('info');

      // Act
      logger.debug('Debug message');

      // Assert
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should not log info messages when level is warn', () => {
      // Arrange
      logger.setLevel('warn');

      // Act
      logger.info('Info message');

      // Assert
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('message formatting', () => {
    it('should format messages with timestamp', () => {
      // Arrange
      const fixedDate = new Date('2023-01-01T12:00:00Z');
      jest.spyOn(Date, 'now').mockReturnValue(fixedDate.getTime());

      // Act
      logger.info('Test message');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('2023-01-01T12:00:00.000Z'),
        expect.stringContaining('Test message'),
      );
    });

    it('should include context information', () => {
      // Act
      logger.info('Test message', { userId: '123', action: 'login' });

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('Test message'),
        expect.objectContaining({
          userId: '123',
          action: 'login',
        }),
      );
    });

    it('should handle error objects', () => {
      // Arrange
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      // Act
      logger.error('Error occurred', { error });

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('Error occurred'),
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            stack: 'Error stack trace',
          }),
        }),
      );
    });

    it('should sanitize sensitive information', () => {
      // Act
      logger.info('User login', {
        email: 'user@example.com',
        password: 'secret123',
        token: 'jwt-token-here',
      });

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('User login'),
        expect.objectContaining({
          email: 'user@example.com',
          password: '[REDACTED]',
          token: '[REDACTED]',
        }),
      );
    });
  });

  describe('file logging', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.appendFileSync.mockImplementation();
    });

    it('should write logs to file when file logging is enabled', () => {
      // Arrange
      const fileLogger = new Logger({ enableFile: true, logDir: '/test/logs' });

      // Act
      fileLogger.info('File log message');

      // Assert
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('app.log'),
        expect.stringContaining('File log message'),
      );
    });

    it('should rotate log files by date', () => {
      // Arrange
      const fileLogger = new Logger({ enableFile: true, logDir: '/test/logs' });
      const fixedDate = new Date('2023-01-01');
      jest.spyOn(Date, 'now').mockReturnValue(fixedDate.getTime());

      // Act
      fileLogger.info('Test message');

      // Assert
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('2023-01-01'),
        expect.any(String),
      );
    });

    it('should separate error logs into different file', () => {
      // Arrange
      const fileLogger = new Logger({ enableFile: true, logDir: '/test/logs' });

      // Act
      fileLogger.error('Error message');

      // Assert
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('error.log'),
        expect.stringContaining('Error message'),
      );
    });

    it('should handle file write errors gracefully', () => {
      // Arrange
      const fileLogger = new Logger({ enableFile: true, logDir: '/test/logs' });
      mockFs.appendFileSync.mockImplementation(() => {
        throw new Error('File write error');
      });

      // Act & Assert
      expect(() => {
        fileLogger.info('Test message');
      }).not.toThrow();
    });
  });

  describe('production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should disable console logging in production', () => {
      // Arrange
      const prodLogger = new Logger();

      // Act
      prodLogger.info('Production message');

      // Assert
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should still log errors in production', () => {
      // Arrange
      const prodLogger = new Logger();

      // Act
      prodLogger.error('Production error');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('Production error'),
      );
    });

    it('should enable file logging by default in production', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.appendFileSync.mockImplementation();
      const prodLogger = new Logger();

      // Act
      prodLogger.info('Production file log');

      // Assert
      expect(mockFs.appendFileSync).toHaveBeenCalled();
    });
  });

  describe('structured logging', () => {
    it('should support structured log entries', () => {
      // Act
      logger.logStructured('info', 'User action', {
        userId: '123',
        action: 'create_work',
        workId: '456',
        timestamp: new Date().toISOString(),
      });

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('User action'),
        expect.objectContaining({
          userId: '123',
          action: 'create_work',
          workId: '456',
        }),
      );
    });

    it('should support request logging', () => {
      // Arrange
      const requestData = {
        method: 'POST',
        url: '/api/works',
        statusCode: 201,
        responseTime: 150,
        userAgent: 'Mozilla/5.0...',
      };

      // Act
      logger.logRequest(requestData);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('HTTP Request'),
        expect.objectContaining(requestData),
      );
    });

    it('should support performance logging', () => {
      // Arrange
      const performanceData = {
        operation: 'ai_generation',
        duration: 2500,
        success: true,
        metadata: { model: 'gemini-pro' },
      };

      // Act
      logger.logPerformance(performanceData);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('Performance'),
        expect.objectContaining(performanceData),
      );
    });
  });

  describe('child loggers', () => {
    it('should create child logger with additional context', () => {
      // Arrange
      const childLogger = logger.child({ service: 'auth', version: '1.0' });

      // Act
      childLogger.info('Child log message');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('Child log message'),
        expect.objectContaining({
          service: 'auth',
          version: '1.0',
        }),
      );
    });

    it('should inherit parent logger configuration', () => {
      // Arrange
      logger.setLevel('warn');
      const childLogger = logger.child({ service: 'test' });

      // Act
      childLogger.info('Info message');
      childLogger.warn('Warning message');

      // Assert
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Info message'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning message'),
      );
    });

    it('should merge context from parent and child', () => {
      // Arrange
      const parentLogger = logger.child({ service: 'api' });
      const childLogger = parentLogger.child({ module: 'auth' });

      // Act
      childLogger.info('Nested context');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('Nested context'),
        expect.objectContaining({
          service: 'api',
          module: 'auth',
        }),
      );
    });
  });

  describe('log filtering', () => {
    it('should filter logs by namespace', () => {
      // Arrange
      process.env.DEBUG = 'app:auth';
      const authLogger = logger.child({ namespace: 'app:auth' });
      const dbLogger = logger.child({ namespace: 'app:db' });

      // Act
      authLogger.debug('Auth debug message');
      dbLogger.debug('DB debug message');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auth debug message'),
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('DB debug message'),
      );
    });

    it('should support wildcard filtering', () => {
      // Arrange
      process.env.DEBUG = 'app:*';
      const authLogger = logger.child({ namespace: 'app:auth' });
      const utilsLogger = logger.child({ namespace: 'utils:cache' });

      // Act
      authLogger.debug('App auth message');
      utilsLogger.debug('Utils cache message');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('App auth message'),
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Utils cache message'),
      );
    });
  });

  describe('log aggregation', () => {
    it('should collect logs for analysis', () => {
      // Arrange
      const aggregatingLogger = new Logger({ enableAggregation: true });

      // Act
      aggregatingLogger.info('Message 1');
      aggregatingLogger.warn('Message 2');
      aggregatingLogger.error('Message 3');

      const logs = aggregatingLogger.getCollectedLogs();

      // Assert
      expect(logs).toHaveLength(3);
      expect(logs[0]).toMatchObject({
        level: 'info',
        message: 'Message 1',
      });
      expect(logs[1]).toMatchObject({
        level: 'warn',
        message: 'Message 2',
      });
      expect(logs[2]).toMatchObject({
        level: 'error',
        message: 'Message 3',
      });
    });

    it('should limit collected logs to prevent memory issues', () => {
      // Arrange
      const aggregatingLogger = new Logger({
        enableAggregation: true,
        maxCollectedLogs: 5,
      });

      // Act
      for (let i = 0; i < 10; i++) {
        aggregatingLogger.info(`Message ${i}`);
      }

      const logs = aggregatingLogger.getCollectedLogs();

      // Assert
      expect(logs).toHaveLength(5);
      expect(logs[0].message).toContain('Message 5'); // Should keep latest logs
    });

    it('should clear collected logs', () => {
      // Arrange
      const aggregatingLogger = new Logger({ enableAggregation: true });
      aggregatingLogger.info('Test message');

      // Act
      aggregatingLogger.clearCollectedLogs();
      const logs = aggregatingLogger.getCollectedLogs();

      // Assert
      expect(logs).toHaveLength(0);
    });
  });

  describe('async logging', () => {
    it('should support async log operations', async () => {
      // Arrange
      const asyncLogger = new Logger({ enableAsync: true });
      mockFs.appendFile = jest.fn().mockImplementation((path, data, callback) => {
        setTimeout(() => callback(null), 10);
      });

      // Act
      await asyncLogger.infoAsync('Async message');

      // Assert
      expect(mockFs.appendFile).toHaveBeenCalled();
    });

    it('should handle async logging errors', async () => {
      // Arrange
      const asyncLogger = new Logger({ enableAsync: true });
      mockFs.appendFile = jest.fn().mockImplementation((path, data, callback) => {
        setTimeout(() => callback(new Error('Async error')), 10);
      });

      // Act & Assert
      await expect(asyncLogger.infoAsync('Async message')).resolves.not.toThrow();
    });
  });
});
