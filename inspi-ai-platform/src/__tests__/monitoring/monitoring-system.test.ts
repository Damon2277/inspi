import { healthManager, databaseHealthCheck, memoryHealthCheck } from '@/lib/monitoring/health';
import { errorFilter, requestFilter } from '@/lib/monitoring/filters';
import { recordPerformanceMetric, PerformanceTimer } from '@/lib/monitoring/performance';
import { monitoringContext } from '@/lib/monitoring/context';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
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
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// 模拟日志记录器
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

describe('监控系统测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('健康检查系统', () => {
    beforeEach(() => {
      // 清除所有已注册的检查
      const registeredChecks = ['application', 'memory', 'disk', 'database', 'redis'];
      registeredChecks.forEach(name => {
        try {
          healthManager.unregister(name);
        } catch (e) {
          // 忽略未注册的检查
        }
      });
    });

    it('应该能够注册和执行健康检查', async () => {
      const mockCheck = jest.fn().mockResolvedValue({
        status: 'healthy',
        message: 'Test check passed'
      });

      healthManager.register('test', mockCheck);
      const result = await healthManager.runCheck('test');

      expect(mockCheck).toHaveBeenCalled();
      expect(result.name).toBe('test');
      expect(result.status).toBe('healthy');
      expect(result.message).toBe('Test check passed');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeGreaterThan(0);

      healthManager.unregister('test');
    });

    it('应该能够执行所有健康检查', async () => {
      const mockCheck1 = jest.fn().mockResolvedValue({
        status: 'healthy',
        message: 'Check 1 passed'
      });
      const mockCheck2 = jest.fn().mockResolvedValue({
        status: 'degraded',
        message: 'Check 2 degraded'
      });

      healthManager.register('test1', mockCheck1);
      healthManager.register('test2', mockCheck2);

      const results = await healthManager.runAllChecks();

      expect(results).toHaveLength(2);
      expect(results.find(r => r.name === 'test1')?.status).toBe('healthy');
      expect(results.find(r => r.name === 'test2')?.status).toBe('degraded');

      healthManager.unregister('test1');
      healthManager.unregister('test2');
    });

    it('应该能够获取系统健康状态', async () => {
      const mockHealthyCheck = jest.fn().mockResolvedValue({
        status: 'healthy',
        message: 'Healthy'
      });
      const mockUnhealthyCheck = jest.fn().mockResolvedValue({
        status: 'unhealthy',
        message: 'Unhealthy'
      });

      healthManager.register('healthy', mockHealthyCheck);
      healthManager.register('unhealthy', mockUnhealthyCheck);

      const systemHealth = await healthManager.getSystemHealth();

      expect(systemHealth.status).toBe('unhealthy'); // 因为有不健康的检查
      expect(systemHealth.summary.total).toBe(2);
      expect(systemHealth.summary.healthy).toBe(1);
      expect(systemHealth.summary.unhealthy).toBe(1);
      expect(systemHealth.uptime).toBeGreaterThan(0);

      healthManager.unregister('healthy');
      healthManager.unregister('unhealthy');
    });

    it('应该处理健康检查超时', async () => {
      const slowCheck = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          status: 'healthy',
          message: 'Slow check'
        }), 10000)) // 10秒，超过5秒超时限制
      );

      healthManager.register('slow', slowCheck);
      const result = await healthManager.runCheck('slow');

      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('timeout');

      healthManager.unregister('slow');
    });
  });

  describe('错误过滤器', () => {
    it('应该正确过滤错误', () => {
      const normalError = new Error('Normal error');
      const networkError = new Error('Network request failed');

      const normalResult = errorFilter.filterError(normalError);
      const networkResult = errorFilter.filterError(networkError);

      expect(normalResult.shouldReport).toBe(true);
      expect(networkResult.shouldReport).toBe(false);
      expect(networkResult.reason).toBe('Error matches ignore patterns');
    });

    it('应该生成错误指纹', () => {
      const error1 = new Error('Test error 123');
      const error2 = new Error('Test error 456');
      const error3 = new Error('Different error');

      const result1 = errorFilter.filterError(error1, { component: 'TestComponent' });
      const result2 = errorFilter.filterError(error2, { component: 'TestComponent' });
      const result3 = errorFilter.filterError(error3, { component: 'TestComponent' });

      // 相似错误应该有相同的指纹（数字被替换为N）
      expect(result1.fingerprint).toEqual(result2.fingerprint);
      expect(result1.fingerprint).not.toEqual(result3.fingerprint);
    });

    it('应该实施频率限制', () => {
      const error = new Error('Repeated error');
      const context = { component: 'TestComponent' };

      // 前10次应该通过
      for (let i = 0; i < 10; i++) {
        const result = errorFilter.filterError(error, context);
        expect(result.shouldReport).toBe(true);
      }

      // 第11次应该被限制
      const result = errorFilter.filterError(error, context);
      expect(result.shouldReport).toBe(false);
      expect(result.reason).toBe('Rate limited');
    });
  });

  describe('请求过滤器', () => {
    it('应该正确过滤请求', () => {
      const apiRequest = {
        method: 'GET',
        url: '/api/users',
        statusCode: 200,
        duration: 100
      };

      const staticRequest = {
        method: 'GET',
        url: '/static/image.png',
        statusCode: 200,
        duration: 50
      };

      const apiResult = requestFilter.filterRequest(apiRequest);
      const staticResult = requestFilter.filterRequest(staticRequest);

      expect(apiResult.shouldTrack).toBe(true);
      expect(staticResult.shouldTrack).toBe(false);
    });

    it('应该根据请求特征调整采样率', () => {
      const normalRequest = {
        method: 'GET',
        url: '/page',
        statusCode: 200,
        duration: 100
      };

      const errorRequest = {
        method: 'POST',
        url: '/api/data',
        statusCode: 500,
        duration: 200
      };

      const slowRequest = {
        method: 'GET',
        url: '/api/slow',
        statusCode: 200,
        duration: 3000
      };

      const normalResult = requestFilter.filterRequest(normalRequest);
      const errorResult = requestFilter.filterRequest(errorRequest);
      const slowResult = requestFilter.filterRequest(slowRequest);

      expect(normalResult.sampleRate).toBe(0.1); // 正常请求低采样率
      expect(errorResult.sampleRate).toBe(0.5); // API错误请求采样率
      expect(slowResult.sampleRate).toBe(0.5); // API慢请求采样率
    });
  });

  describe('性能监控', () => {
    it('应该能够记录性能指标', () => {
      // 性能指标记录不会直接输出到控制台，而是通过Sentry系统
      // 这里我们只测试函数能够正常调用而不抛出错误
      expect(() => {
        recordPerformanceMetric('test_metric', 100, 'ms', {
          component: 'TestComponent'
        });
      }).not.toThrow();
    });

    it('应该能够使用性能计时器', () => {
      const timer = new PerformanceTimer('test_operation', {
        component: 'TestComponent'
      });

      // 模拟一些操作
      const start = performance.now();
      
      // 结束计时
      const duration = timer.end();
      const actualDuration = performance.now() - start;

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(actualDuration + 10); // 允许一些误差
    });
  });

  describe('监控上下文', () => {
    beforeEach(() => {
      monitoringContext.clearContext();
    });

    it('应该能够设置用户上下文', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser'
      };

      monitoringContext.setUser(user);
      const context = monitoringContext.getCurrentContext();

      expect(context.user).toEqual(user);
    });

    it('应该能够设置请求上下文', () => {
      const request = {
        id: 'req-123',
        method: 'GET',
        url: '/api/test',
        statusCode: 200
      };

      monitoringContext.setRequest(request);
      const context = monitoringContext.getCurrentContext();

      expect(context.request).toEqual(request);
    });

    it('应该能够设置业务上下文', () => {
      const business = {
        workId: 'work-123',
        userId: 'user-456',
        feature: 'ai_teaching',
        action: 'generate_cards'
      };

      monitoringContext.setBusiness(business);
      const context = monitoringContext.getCurrentContext();

      expect(context.business).toEqual(business);
    });

    it('应该能够添加面包屑', () => {
      // 面包屑添加不会直接输出到控制台，而是通过Sentry系统
      // 这里我们只测试函数能够正常调用而不抛出错误
      expect(() => {
        monitoringContext.addBreadcrumb('Test breadcrumb', 'user', {
          action: 'click'
        });
      }).not.toThrow();
    });

    it('应该能够清除上下文', () => {
      monitoringContext.setUser({ id: 'user-123' });
      monitoringContext.setRequest({ method: 'GET', url: '/test' });

      let context = monitoringContext.getCurrentContext();
      expect(context.user.id).toBe('user-123');
      expect(context.request.method).toBe('GET');

      monitoringContext.clearContext();
      context = monitoringContext.getCurrentContext();
      
      expect(context.user).toEqual({});
      expect(context.request).toEqual({});
    });
  });
});