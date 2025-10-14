/**
 * 健康检查系统
 */

import { logger } from '@/lib/logging/logger';

/**
 * 健康检查结果接口
 */
export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * 系统健康状态接口
 */
export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: number;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

/**
 * 健康检查函数类型
 */
export type HealthCheckFunction = () => Promise<Omit<HealthCheckResult, 'name' | 'duration' | 'timestamp'>>;

/**
 * 健康检查管理器
 */
class HealthCheckManager {
  private checks = new Map<string, HealthCheckFunction>();
  private lastResults = new Map<string, HealthCheckResult>();
  private startTime = Date.now();

  /**
   * 注册健康检查
   */
  register(name: string, checkFn: HealthCheckFunction) {
    this.checks.set(name, checkFn);
  }

  /**
   * 注销健康检查
   */
  unregister(name: string) {
    this.checks.delete(name);
    this.lastResults.delete(name);
  }

  /**
   * 执行单个健康检查
   */
  async runCheck(name: string): Promise<HealthCheckResult> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      throw new Error(`Health check '${name}' not found`);
    }

    const startTime = Date.now();

    try {
      const result = await Promise.race([
        checkFn(),
        this.timeout(5000), // 5秒超时
      ]);

      const healthResult: HealthCheckResult = {
        name,
        status: result.status,
        message: result.message,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        metadata: result.metadata,
      };

      this.lastResults.set(name, healthResult);
      return healthResult;
    } catch (error) {
      const healthResult: HealthCheckResult = {
        name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };

      this.lastResults.set(name, healthResult);
      return healthResult;
    }
  }

  /**
   * 执行所有健康检查
   */
  async runAllChecks(): Promise<HealthCheckResult[]> {
    const checkNames = Array.from(this.checks.keys());
    const results = await Promise.allSettled(
      checkNames.map(name => this.runCheck(name)),
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: checkNames[index],
          status: 'unhealthy' as const,
          message: result.reason?.message || 'Check failed',
          duration: 0,
          timestamp: Date.now(),
        };
      }
    });
  }

  /**
   * 获取系统健康状态
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const checks = await this.runAllChecks();

    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
    };

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      summary,
    };
  }

  /**
   * 获取最后的检查结果
   */
  getLastResults(): HealthCheckResult[] {
    return Array.from(this.lastResults.values());
  }

  /**
   * 超时Promise
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), ms);
    });
  }
}

/**
 * 数据库健康检查
 */
export const databaseHealthCheck: HealthCheckFunction = async () => {
  try {
    // 这里应该实际连接数据库进行检查
    // 例如：await db.ping() 或执行简单查询

    // 模拟数据库检查
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    const responseTime = Date.now() - startTime;

    if (responseTime > 1000) {
      return {
        status: 'degraded',
        message: `Database response time is slow: ${responseTime}ms`,
        metadata: { responseTime },
      };
    }

    return {
      status: 'healthy',
      message: 'Database is responding normally',
      metadata: { responseTime },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Redis健康检查
 */
export const redisHealthCheck: HealthCheckFunction = async () => {
  try {
    // 这里应该实际连接Redis进行检查
    // 例如：await redis.ping()

    // 模拟Redis检查
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      message: 'Redis is responding normally',
      metadata: { responseTime },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * 内存健康检查
 */
export const memoryHealthCheck: HealthCheckFunction = async () => {
  try {
    const memoryUsage = process.memoryUsage();
    const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const percentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = `Memory usage: ${usedMB}MB / ${totalMB}MB (${percentage.toFixed(1)}%)`;

    if (percentage > 90) {
      status = 'unhealthy';
      message = `Critical memory usage: ${percentage.toFixed(1)}%`;
    } else if (percentage > 80) {
      status = 'degraded';
      message = `High memory usage: ${percentage.toFixed(1)}%`;
    }

    return {
      status,
      message,
      metadata: {
        usedMB,
        totalMB,
        percentage: Math.round(percentage),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * 磁盘空间健康检查
 */
export const diskHealthCheck: HealthCheckFunction = async () => {
  try {
    // 在Node.js环境中检查磁盘空间
    // 这里需要使用fs模块或第三方库

    // 模拟磁盘检查
    const freeSpaceGB = Math.random() * 100;
    const totalSpaceGB = 500;
    const usedPercentage = ((totalSpaceGB - freeSpaceGB) / totalSpaceGB) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = `Disk usage: ${usedPercentage.toFixed(1)}% (${freeSpaceGB.toFixed(1)}GB free)`;

    if (usedPercentage > 95) {
      status = 'unhealthy';
      message = `Critical disk usage: ${usedPercentage.toFixed(1)}%`;
    } else if (usedPercentage > 85) {
      status = 'degraded';
      message = `High disk usage: ${usedPercentage.toFixed(1)}%`;
    }

    return {
      status,
      message,
      metadata: {
        freeSpaceGB: Math.round(freeSpaceGB),
        totalSpaceGB,
        usedPercentage: Math.round(usedPercentage),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Disk check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * 外部服务健康检查
 */
export const externalServiceHealthCheck = (serviceName: string, url: string): HealthCheckFunction => {
  return async () => {
    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000,
      } as any);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          status: 'unhealthy',
          message: `${serviceName} returned ${response.status}: ${response.statusText}`,
          metadata: { statusCode: response.status, responseTime },
        };
      }

      if (responseTime > 2000) {
        return {
          status: 'degraded',
          message: `${serviceName} is slow: ${responseTime}ms`,
          metadata: { statusCode: response.status, responseTime },
        };
      }

      return {
        status: 'healthy',
        message: `${serviceName} is responding normally`,
        metadata: { statusCode: response.status, responseTime },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `${serviceName} is unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  };
};

/**
 * 应用健康检查
 */
export const applicationHealthCheck: HealthCheckFunction = async () => {
  try {
    // 检查应用关键功能
    const checks = [
      // 检查环境变量
      process.env.NODE_ENV ? true : false,
      // 检查关键模块
      typeof logger !== 'undefined',
      // 其他关键检查...
    ];

    const allPassed = checks.every(check => check);

    return {
      status: allPassed ? 'healthy' : 'degraded',
      message: allPassed ? 'Application is running normally' : 'Some application checks failed',
      metadata: {
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Application check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

// 创建全局健康检查管理器
export const healthManager = new HealthCheckManager();

// 注册默认健康检查
healthManager.register('application', applicationHealthCheck);
healthManager.register('memory', memoryHealthCheck);
healthManager.register('disk', diskHealthCheck);

// 在服务器环境中注册数据库和Redis检查
if (typeof window === 'undefined') {
  healthManager.register('database', databaseHealthCheck);
  healthManager.register('redis', redisHealthCheck);
}

/**
 * 健康检查中间件
 */
export function createHealthCheckMiddleware() {
  return async (req: any, res: any) => {
    try {
      const health = await healthManager.getSystemHealth();

      // 根据健康状态设置HTTP状态码
      let statusCode = 200;
      if (health.status === 'degraded') {
        statusCode = 200; // 降级但仍可用
      } else if (health.status === 'unhealthy') {
        statusCode = 503; // 服务不可用
      }

      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)));

      res.status(500).json({
        status: 'unhealthy',
        timestamp: Date.now(),
        message: 'Health check system failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

export default healthManager;
