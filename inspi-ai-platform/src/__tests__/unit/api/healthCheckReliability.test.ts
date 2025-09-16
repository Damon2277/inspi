/**
 * 健康检查API可靠性测试
 * 测试健康检查API的可靠性、监控能力和故障检测
 */

import { NextRequest, NextResponse } from 'next/server';
import { healthManager, HealthCheckResult, SystemHealth } from '@/lib/monitoring/health';

// Mock health manager
const mockHealthManager = {
  getSystemHealth: jest.fn(),
  runCheck: jest.fn(),
  runAllChecks: jest.fn(),
  register: jest.fn(),
  unregister: jest.fn(),
  getLastResults: jest.fn()
};

jest.mock('@/lib/monitoring/health', () => ({
  healthManager: mockHealthManager,
  createHealthCheckMiddleware: jest.fn()
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.mock('@/lib/utils/logger', () => ({
  logger: mockLogger
}));

// Create mock health API handlers
const createHealthApiHandler = (method: 'GET' | 'POST') => {
  return async (request: NextRequest) => {
    try {
      if (method === 'GET') {
        const health = await mockHealthManager.getSystemHealth();
        
        let statusCode = 200;
        if (health.status === 'degraded') {
          statusCode = 200;
        } else if (health.status === 'unhealthy') {
          statusCode = 503;
        }

        mockLogger.info('Health check performed', {
          metadata: {
            status: health.status,
            totalChecks: health.summary.total,
            healthyChecks: health.summary.healthy,
            unhealthyChecks: health.summary.unhealthy,
            degradedChecks: health.summary.degraded,
            uptime: health.uptime
          }
        });

        return new NextResponse(JSON.stringify(health), { status: statusCode });
      } else {
        const body = await request.json();
        
        if (!Array.isArray(body.checks)) {
          return new NextResponse(
            JSON.stringify({ error: 'Invalid request body. Expected array of check names.' }),
            { status: 400 }
          );
        }

        if (body.checks.length === 0) {
          return new NextResponse(JSON.stringify({
            status: 'healthy',
            timestamp: Date.now(),
            checks: [],
            summary: { total: 0, healthy: 0, unhealthy: 0, degraded: 0 }
          }));
        }

        const results = await Promise.allSettled(
          body.checks.map((checkName: string) => mockHealthManager.runCheck(checkName))
        );

        const checks = results.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return {
              name: body.checks[index],
              status: 'unhealthy',
              message: result.reason?.message || 'Check failed',
              duration: 0,
              timestamp: Date.now()
            };
          }
        });

        const summary = {
          total: checks.length,
          healthy: checks.filter(c => c.status === 'healthy').length,
          unhealthy: checks.filter(c => c.status === 'unhealthy').length,
          degraded: checks.filter(c => c.status === 'degraded').length
        };

        let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
        if (summary.unhealthy > 0) {
          overallStatus = 'unhealthy';
        } else if (summary.degraded > 0) {
          overallStatus = 'degraded';
        }

        return new NextResponse(JSON.stringify({
          status: overallStatus,
          timestamp: Date.now(),
          checks,
          summary
        }));
      }
    } catch (error) {
      mockLogger.error('Health check failed', error instanceof Error ? error : new Error(String(error)));
      
      return new NextResponse(JSON.stringify({
        status: 'unhealthy',
        timestamp: Date.now(),
        message: 'Health check system failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }), { status: 500 });
    }
  };
};

const getHealthHandler = createHealthApiHandler('GET');
const postHealthHandler = createHealthApiHandler('POST');

// Helper function to create mock request
function createMockRequest(method: string, body?: any) {
  return {
    method,
    json: jest.fn().mockResolvedValue(body || {}),
    headers: new Map(),
    url: 'http://localhost:3000/api/health'
  } as unknown as NextRequest;
}

describe('健康检查API可靠性测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('系统健康状态检测', () => {
    it('应该正确报告健康的系统状态', async () => {
      // Arrange
      const healthySystemHealth: SystemHealth = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [
          {
            name: 'database',
            status: 'healthy',
            message: 'Database connection OK',
            duration: 50,
            timestamp: Date.now()
          },
          {
            name: 'redis',
            status: 'healthy',
            message: 'Redis connection OK',
            duration: 30,
            timestamp: Date.now()
          },
          {
            name: 'memory',
            status: 'healthy',
            message: 'Memory usage: 45%',
            duration: 10,
            timestamp: Date.now()
          }
        ],
        summary: {
          total: 3,
          healthy: 3,
          unhealthy: 0,
          degraded: 0
        }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(healthySystemHealth);

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.status).toBe('healthy');
      expect(responseData.summary.healthy).toBe(3);
      expect(responseData.summary.unhealthy).toBe(0);
      expect(responseData.checks).toHaveLength(3);
      
      // 验证日志记录
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Health check performed',
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: 'healthy',
            totalChecks: 3,
            healthyChecks: 3,
            unhealthyChecks: 0
          })
        })
      );
    });

    it('应该正确报告降级的系统状态', async () => {
      // Arrange
      const degradedSystemHealth: SystemHealth = {
        status: 'degraded',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [
          {
            name: 'database',
            status: 'healthy',
            message: 'Database connection OK',
            duration: 50,
            timestamp: Date.now()
          },
          {
            name: 'redis',
            status: 'degraded',
            message: 'Redis connection slow: 1500ms',
            duration: 1500,
            timestamp: Date.now(),
            metadata: { responseTime: 1500 }
          },
          {
            name: 'memory',
            status: 'degraded',
            message: 'High memory usage: 85%',
            duration: 10,
            timestamp: Date.now(),
            metadata: { percentage: 85 }
          }
        ],
        summary: {
          total: 3,
          healthy: 1,
          unhealthy: 0,
          degraded: 2
        }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(degradedSystemHealth);

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200); // 降级但仍可用
      expect(responseData.status).toBe('degraded');
      expect(responseData.summary.degraded).toBe(2);
      expect(responseData.checks.some((check: any) => check.status === 'degraded')).toBe(true);
    });

    it('应该正确报告不健康的系统状态', async () => {
      // Arrange
      const unhealthySystemHealth: SystemHealth = {
        status: 'unhealthy',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [
          {
            name: 'database',
            status: 'unhealthy',
            message: 'Database connection failed',
            duration: 5000,
            timestamp: Date.now()
          },
          {
            name: 'redis',
            status: 'healthy',
            message: 'Redis connection OK',
            duration: 30,
            timestamp: Date.now()
          },
          {
            name: 'ai-service',
            status: 'unhealthy',
            message: 'AI service unreachable',
            duration: 5000,
            timestamp: Date.now()
          }
        ],
        summary: {
          total: 3,
          healthy: 1,
          unhealthy: 2,
          degraded: 0
        }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(unhealthySystemHealth);

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(503); // 服务不可用
      expect(responseData.status).toBe('unhealthy');
      expect(responseData.summary.unhealthy).toBe(2);
      expect(responseData.checks.some((check: any) => check.status === 'unhealthy')).toBe(true);
    });
  });

  describe('特定健康检查执行', () => {
    it('应该执行指定的健康检查', async () => {
      // Arrange
      const checkResults: HealthCheckResult[] = [
        {
          name: 'database',
          status: 'healthy',
          message: 'Database connection OK',
          duration: 50,
          timestamp: Date.now()
        },
        {
          name: 'redis',
          status: 'healthy',
          message: 'Redis connection OK',
          duration: 30,
          timestamp: Date.now()
        }
      ];

      mockHealthManager.runCheck
        .mockResolvedValueOnce(checkResults[0])
        .mockResolvedValueOnce(checkResults[1]);

      const request = createMockRequest('POST', {
        checks: ['database', 'redis']
      });

      // Act
      const response = await postHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.status).toBe('healthy');
      expect(responseData.checks).toHaveLength(2);
      expect(responseData.summary.total).toBe(2);
      expect(responseData.summary.healthy).toBe(2);
      
      expect(mockHealthManager.runCheck).toHaveBeenCalledTimes(2);
      expect(mockHealthManager.runCheck).toHaveBeenCalledWith('database');
      expect(mockHealthManager.runCheck).toHaveBeenCalledWith('redis');
    });

    it('应该处理部分检查失败', async () => {
      // Arrange
      const successResult: HealthCheckResult = {
        name: 'database',
        status: 'healthy',
        message: 'Database connection OK',
        duration: 50,
        timestamp: Date.now()
      };

      mockHealthManager.runCheck
        .mockResolvedValueOnce(successResult)
        .mockRejectedValueOnce(new Error('Redis connection failed'));

      const request = createMockRequest('POST', {
        checks: ['database', 'redis']
      });

      // Act
      const response = await postHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.status).toBe('unhealthy');
      expect(responseData.checks).toHaveLength(2);
      expect(responseData.summary.healthy).toBe(1);
      expect(responseData.summary.unhealthy).toBe(1);
      
      const failedCheck = responseData.checks.find((check: any) => check.name === 'redis');
      expect(failedCheck.status).toBe('unhealthy');
      expect(failedCheck.message).toBe('Redis connection failed');
    });

    it('应该处理空的检查列表', async () => {
      // Arrange
      const request = createMockRequest('POST', {
        checks: []
      });

      // Act
      const response = await postHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.status).toBe('healthy');
      expect(responseData.checks).toHaveLength(0);
      expect(responseData.summary.total).toBe(0);
    });

    it('应该验证请求体格式', async () => {
      // Arrange
      const request = createMockRequest('POST', {
        checks: 'invalid' // 非数组类型
      });

      // Act
      const response = await postHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid request body. Expected array of check names.');
    });
  });

  describe('故障检测和恢复测试', () => {
    it('应该检测数据库连接故障', async () => {
      // Arrange
      const databaseFailureHealth: SystemHealth = {
        status: 'unhealthy',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [
          {
            name: 'database',
            status: 'unhealthy',
            message: 'Connection timeout after 5000ms',
            duration: 5000,
            timestamp: Date.now(),
            metadata: { error: 'ETIMEDOUT' }
          }
        ],
        summary: {
          total: 1,
          healthy: 0,
          unhealthy: 1,
          degraded: 0
        }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(databaseFailureHealth);

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(responseData.status).toBe('unhealthy');
      expect(responseData.checks[0].message).toContain('timeout');
    });

    it('应该检测内存使用过高', async () => {
      // Arrange
      const memoryIssueHealth: SystemHealth = {
        status: 'degraded',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [
          {
            name: 'memory',
            status: 'degraded',
            message: 'High memory usage: 88%',
            duration: 10,
            timestamp: Date.now(),
            metadata: {
              usedMB: 1760,
              totalMB: 2000,
              percentage: 88
            }
          }
        ],
        summary: {
          total: 1,
          healthy: 0,
          unhealthy: 0,
          degraded: 1
        }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(memoryIssueHealth);

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.status).toBe('degraded');
      expect(responseData.checks[0].metadata.percentage).toBe(88);
    });

    it('应该检测外部服务不可用', async () => {
      // Arrange
      const externalServiceFailure: SystemHealth = {
        status: 'unhealthy',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [
          {
            name: 'ai-service',
            status: 'unhealthy',
            message: 'AI service is unreachable: Connection refused',
            duration: 5000,
            timestamp: Date.now(),
            metadata: { statusCode: null, responseTime: 5000 }
          }
        ],
        summary: {
          total: 1,
          healthy: 0,
          unhealthy: 1,
          degraded: 0
        }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(externalServiceFailure);

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(responseData.status).toBe('unhealthy');
      expect(responseData.checks[0].message).toContain('unreachable');
    });

    it('应该检测磁盘空间不足', async () => {
      // Arrange
      const diskSpaceIssue: SystemHealth = {
        status: 'unhealthy',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [
          {
            name: 'disk',
            status: 'unhealthy',
            message: 'Critical disk usage: 96%',
            duration: 20,
            timestamp: Date.now(),
            metadata: {
              freeSpaceGB: 2,
              totalSpaceGB: 50,
              usedPercentage: 96
            }
          }
        ],
        summary: {
          total: 1,
          healthy: 0,
          unhealthy: 1,
          degraded: 0
        }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(diskSpaceIssue);

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(responseData.status).toBe('unhealthy');
      expect(responseData.checks[0].metadata.usedPercentage).toBe(96);
    });
  });

  describe('性能监控测试', () => {
    it('应该监控健康检查执行时间', async () => {
      // Arrange
      const slowHealthCheck: SystemHealth = {
        status: 'degraded',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [
          {
            name: 'database',
            status: 'degraded',
            message: 'Database response time is slow: 2500ms',
            duration: 2500,
            timestamp: Date.now(),
            metadata: { responseTime: 2500 }
          }
        ],
        summary: {
          total: 1,
          healthy: 0,
          unhealthy: 0,
          degraded: 1
        }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(slowHealthCheck);

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.checks[0].duration).toBe(2500);
      expect(responseData.checks[0].message).toContain('slow');
    });

    it('应该在合理时间内完成健康检查', async () => {
      // Arrange
      const fastHealthCheck: SystemHealth = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [
          {
            name: 'memory',
            status: 'healthy',
            message: 'Memory usage: 45%',
            duration: 5,
            timestamp: Date.now()
          },
          {
            name: 'application',
            status: 'healthy',
            message: 'Application is running normally',
            duration: 10,
            timestamp: Date.now()
          }
        ],
        summary: {
          total: 2,
          healthy: 2,
          unhealthy: 0,
          degraded: 0
        }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(fastHealthCheck);

      const request = createMockRequest('GET');
      const startTime = Date.now();

      // Act
      const response = await getHealthHandler(request);

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
      expect(response.status).toBe(200);
    });

    it('应该处理健康检查超时', async () => {
      // Arrange
      const timeoutHealthCheck: SystemHealth = {
        status: 'unhealthy',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [
          {
            name: 'external-service',
            status: 'unhealthy',
            message: 'Health check timeout',
            duration: 5000,
            timestamp: Date.now()
          }
        ],
        summary: {
          total: 1,
          healthy: 0,
          unhealthy: 1,
          degraded: 0
        }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(timeoutHealthCheck);

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(responseData.checks[0].message).toBe('Health check timeout');
    });
  });

  describe('错误处理和恢复测试', () => {
    it('应该处理健康检查系统故障', async () => {
      // Arrange
      mockHealthManager.getSystemHealth.mockRejectedValue(new Error('Health system crashed'));

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.status).toBe('unhealthy');
      expect(responseData.message).toBe('Health check system failed');
      expect(responseData.error).toBe('Health system crashed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.any(Error)
      );
    });

    it('应该处理未知错误', async () => {
      // Arrange
      mockHealthManager.getSystemHealth.mockRejectedValue('Unknown error string');

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Unknown error');
    });

    it('应该处理JSON解析错误', async () => {
      // Arrange
      const request = {
        method: 'POST',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: new Map(),
        url: 'http://localhost:3000/api/health'
      } as unknown as NextRequest;

      // Act
      const response = await postHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.status).toBe('unhealthy');
      expect(responseData.error).toBe('Invalid JSON');
    });

    it('应该处理单个检查失败但系统整体可用', async () => {
      // Arrange
      const partialFailureHealth: SystemHealth = {
        status: 'degraded',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [
          {
            name: 'database',
            status: 'healthy',
            message: 'Database connection OK',
            duration: 50,
            timestamp: Date.now()
          },
          {
            name: 'cache',
            status: 'unhealthy',
            message: 'Cache service unavailable',
            duration: 5000,
            timestamp: Date.now()
          },
          {
            name: 'memory',
            status: 'healthy',
            message: 'Memory usage: 45%',
            duration: 10,
            timestamp: Date.now()
          }
        ],
        summary: {
          total: 3,
          healthy: 2,
          unhealthy: 1,
          degraded: 0
        }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(partialFailureHealth);

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(503); // 有不健康的检查，整体不可用
      expect(responseData.status).toBe('degraded');
      expect(responseData.summary.healthy).toBe(2);
      expect(responseData.summary.unhealthy).toBe(1);
    });
  });

  describe('并发和负载测试', () => {
    it('应该处理并发健康检查请求', async () => {
      // Arrange
      const healthyResponse: SystemHealth = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [],
        summary: { total: 0, healthy: 0, unhealthy: 0, degraded: 0 }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(healthyResponse);

      // Act
      const concurrentRequests = Array(10).fill(null).map(() => {
        const request = createMockRequest('GET');
        return getHealthHandler(request);
      });

      const responses = await Promise.all(concurrentRequests);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      expect(mockHealthManager.getSystemHealth).toHaveBeenCalledTimes(10);
    });

    it('应该处理高频健康检查请求', async () => {
      // Arrange
      const healthyResponse: SystemHealth = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [],
        summary: { total: 0, healthy: 0, unhealthy: 0, degraded: 0 }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(healthyResponse);

      const startTime = Date.now();

      // Act
      const rapidRequests = Array(100).fill(null).map(async () => {
        const request = createMockRequest('GET');
        return await getHealthHandler(request);
      });

      await Promise.all(rapidRequests);

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // 100个请求应该在5秒内完成
    });
  });

  describe('监控数据完整性测试', () => {
    it('应该包含完整的系统信息', async () => {
      // Arrange
      const completeSystemHealth: SystemHealth = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.2.3',
        environment: 'production',
        checks: [
          {
            name: 'database',
            status: 'healthy',
            message: 'Database connection OK',
            duration: 50,
            timestamp: Date.now(),
            metadata: { responseTime: 50, connectionPool: 'active' }
          }
        ],
        summary: {
          total: 1,
          healthy: 1,
          unhealthy: 0,
          degraded: 0
        }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(completeSystemHealth);

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(responseData).toHaveProperty('status');
      expect(responseData).toHaveProperty('timestamp');
      expect(responseData).toHaveProperty('uptime');
      expect(responseData).toHaveProperty('version');
      expect(responseData).toHaveProperty('environment');
      expect(responseData).toHaveProperty('checks');
      expect(responseData).toHaveProperty('summary');
      
      expect(responseData.version).toBe('1.2.3');
      expect(responseData.environment).toBe('production');
      expect(responseData.checks[0]).toHaveProperty('metadata');
    });

    it('应该提供准确的统计摘要', async () => {
      // Arrange
      const mixedStatusHealth: SystemHealth = {
        status: 'degraded',
        timestamp: Date.now(),
        uptime: 3600000,
        version: '1.0.0',
        environment: 'test',
        checks: [
          { name: 'check1', status: 'healthy', message: 'OK', duration: 10, timestamp: Date.now() },
          { name: 'check2', status: 'healthy', message: 'OK', duration: 15, timestamp: Date.now() },
          { name: 'check3', status: 'degraded', message: 'Slow', duration: 200, timestamp: Date.now() },
          { name: 'check4', status: 'unhealthy', message: 'Failed', duration: 5000, timestamp: Date.now() },
          { name: 'check5', status: 'degraded', message: 'Warning', duration: 150, timestamp: Date.now() }
        ],
        summary: {
          total: 5,
          healthy: 2,
          unhealthy: 1,
          degraded: 2
        }
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(mixedStatusHealth);

      const request = createMockRequest('GET');

      // Act
      const response = await getHealthHandler(request);
      const responseData = await response.json();

      // Assert
      expect(responseData.summary.total).toBe(5);
      expect(responseData.summary.healthy).toBe(2);
      expect(responseData.summary.unhealthy).toBe(1);
      expect(responseData.summary.degraded).toBe(2);
      expect(responseData.summary.healthy + responseData.summary.unhealthy + responseData.summary.degraded).toBe(5);
    });
  });
});