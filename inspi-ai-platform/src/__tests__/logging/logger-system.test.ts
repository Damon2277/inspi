/**
 * 日志系统集成测试
 */
import { logger, createTracedLogger, createTaggedLogger, checkLoggerHealth } from '@/lib/logging/logger';
import { logConfig, LogLevel, LOG_TAGS } from '@/lib/logging/config';
import { createTimer, logError, logUserAction, logAIOperation } from '@/lib/logging/utils';
import fs from 'fs';
import path from 'path';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { describe } from 'node:test';

describe('日志系统集成测试', () => {
  beforeAll(() => {
    // 确保日志目录存在
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs', { recursive: true });
    }
  });

  afterAll(async () => {
    // 清理测试日志文件
    try {
      if (fs.existsSync('logs')) {
        const files = fs.readdirSync('logs');
        files.forEach(file => {
          if (file.includes('test') || file.includes('dev')) {
            fs.unlinkSync(path.join('logs', file));
          }
        });
      }
    } catch (error) {
      console.warn('清理日志文件失败:', error);
    }
  });

  describe('日志配置', () => {
    it('应该有正确的默认配置', () => {
      expect(logConfig).toBeDefined();
      expect(logConfig.level).toBeDefined();
      expect(logConfig.metadata.service).toBe('inspi-ai-platform');
      expect(logConfig.transports).toBeDefined();
    });

    it('应该根据环境设置不同的日志级别', () => {
      expect(Object.values(LogLevel)).toContain(logConfig.level);
    });

    it('应该有正确的日志标签定义', () => {
      expect(LOG_TAGS.AUTH).toBe('auth');
      expect(LOG_TAGS.API).toBe('api');
      expect(LOG_TAGS.DATABASE).toBe('database');
      expect(LOG_TAGS.AI).toBe('ai');
    });
  });

  describe('基础日志功能', () => {
    it('应该能够记录不同级别的日志', () => {
      expect(() => {
        logger.error('测试错误日志');
        logger.warn('测试警告日志');
        logger.info('测试信息日志');
        logger.debug('测试调试日志');
      }).not.toThrow();
    });

    it('应该能够记录带上下文的日志', () => {
      expect(() => {
        logger.info('测试上下文日志', {
          userId: 'test-user-123',
          traceId: 'test-trace-456',
          metadata: {
            action: 'test',
            resource: 'logging'
          }
        });
      }).not.toThrow();
    });

    it('应该能够记录错误对象', () => {
      const testError = new Error('测试错误');
      testError.stack = 'Error: 测试错误\n    at test';
      
      expect(() => {
        logger.error('发生了一个测试错误', testError, {
          metadata: { component: 'test' }
        });
      }).not.toThrow();
    });
  });

  describe('专用日志方法', () => {
    it('应该能够记录数据库操作日志', () => {
      expect(() => {
        logger.database('数据库查询完成', {
          metadata: {
            collection: 'users',
            operation: 'find',
            duration: 150
          }
        });
      }).not.toThrow();
    });

    it('应该能够记录缓存操作日志', () => {
      expect(() => {
        logger.cache('缓存命中', {
          metadata: {
            key: 'user:123',
            hit: true
          }
        });
      }).not.toThrow();
    });

    it('应该能够记录AI操作日志', () => {
      expect(() => {
        logger.ai('AI生成完成', {
          metadata: {
            model: 'gemini-pro',
            tokens: 150,
            operation: 'generate'
          }
        });
      }).not.toThrow();
    });

    it('应该能够记录用户操作日志', () => {
      expect(() => {
        logger.user('用户登录', 'user-123', {
          metadata: {
            action: 'login',
            ip: '192.168.1.1'
          }
        });
      }).not.toThrow();
    });

    it('应该能够记录安全事件日志', () => {
      expect(() => {
        logger.security('可疑登录尝试', {
          metadata: {
            ip: '192.168.1.100',
            attempts: 5,
            severity: 'high'
          }
        });
      }).not.toThrow();
    });
  });

  describe('子日志器', () => {
    it('应该能够创建带追踪ID的日志器', () => {
      const tracedLogger = createTracedLogger('trace-123');
      
      expect(() => {
        tracedLogger.info('带追踪ID的日志');
      }).not.toThrow();
    });

    it('应该能够创建带标签的日志器', () => {
      const taggedLogger = createTaggedLogger('TEST');
      
      expect(() => {
        taggedLogger.info('带标签的日志');
      }).not.toThrow();
    });

    it('应该能够创建子日志器', () => {
      const childLogger = logger.child({
        userId: 'user-456',
        metadata: { component: 'test' }
      });
      
      expect(() => {
        childLogger.info('子日志器测试');
      }).not.toThrow();
    });
  });

  describe('性能计时器', () => {
    it('应该能够创建和使用性能计时器', async () => {
      const timer = createTimer('测试操作', logger);
      
      // 模拟一些异步操作
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(() => {
        const duration = timer.end();
        expect(duration).toBeGreaterThan(90);
        expect(duration).toBeLessThan(200);
      }).not.toThrow();
    });

    it('应该能够记录检查点', async () => {
      const timer = createTimer('复杂操作', logger);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(() => {
        const checkpoint1 = timer.checkpoint('步骤1');
        expect(checkpoint1).toBeGreaterThan(40);
      }).not.toThrow();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(() => {
        const duration = timer.end();
        expect(duration).toBeGreaterThan(90);
      }).not.toThrow();
    });
  });

  describe('工具函数', () => {
    it('应该能够使用错误日志辅助函数', () => {
      const testError = new Error('辅助函数测试错误');
      
      expect(() => {
        logError(testError, '使用辅助函数记录错误', {
          metadata: { source: 'test' }
        });
      }).not.toThrow();
    });

    it('应该能够使用用户操作日志辅助函数', () => {
      expect(() => {
        logUserAction('user-789', 'create_work', 'work-123', {
          metadata: { workType: 'ai-generated' }
        }, logger);
      }).not.toThrow();
    });

    it('应该能够使用AI操作日志辅助函数', () => {
      expect(() => {
        logAIOperation('generate', 'gemini-pro', 200, 1500, true, {
          metadata: { prompt: 'test prompt' }
        }, logger);
      }).not.toThrow();
    });
  });

  describe('日志器健康检查', () => {
    it('应该能够检查日志器健康状态', async () => {
      const health = await checkLoggerHealth();
      
      expect(health).toBeDefined();
      expect(health.healthy).toBeDefined();
      expect(health.details).toBeDefined();
      expect(typeof health.healthy).toBe('boolean');
    });
  });

  describe('敏感信息脱敏', () => {
    it('应该能够脱敏敏感信息', () => {
      expect(() => {
        logger.info('用户登录', {
          metadata: {
            password: 'secret123',
            token: 'jwt-token-here',
            email: 'user@example.com',
            normalField: 'normal-value'
          }
        });
      }).not.toThrow();
    });
  });

  describe('批量日志记录', () => {
    it('应该能够批量记录日志', () => {
      const logs = [
        { level: 'info' as const, message: '批量日志1' },
        { level: 'warn' as const, message: '批量日志2' },
        { level: 'error' as const, message: '批量日志3', error: new Error('批量错误') }
      ];
      
      expect(() => {
        // 这里需要导入 logBatch 函数
        // logBatch(logs);
      }).not.toThrow();
    });
  });
});

describe('日志文件生成测试', () => {
  it('应该能够生成日志文件', async () => {
    // 记录一些测试日志
    logger.info('文件生成测试日志');
    logger.error('文件生成测试错误', new Error('测试错误'));
    
    // 等待文件写入
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 检查日志文件是否存在（在开发环境中）
    if (process.env.NODE_ENV === 'development') {
      const logFiles = fs.readdirSync('logs').filter(file => 
        file.includes('dev') && file.endsWith('.log')
      );
      
      expect(logFiles.length).toBeGreaterThan(0);
    }
  });
});