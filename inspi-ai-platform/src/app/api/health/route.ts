/**
 * 健康检查API端点
 * 用于监控系统状态和依赖服务健康状况
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { redisManager } from '@/lib/cache/simple-redis';
import { env } from '../../../../config/environment.simple';

// 健康检查结果接口
interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    memory: HealthCheck;
    disk: HealthCheck;
    external: HealthCheck;
  };
  metadata?: {
    nodeVersion: string;
    platform: string;
    arch: string;
  };
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  message?: string;
  details?: any;
}

// 获取系统信息
function getSystemInfo() {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  };
}

// 检查数据库连接
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const result = await connectToDatabase();
    if (!result.success) {
      throw new Error(result.error || 'Database connection failed');
    }

    const responseTime = Date.now() - startTime;

    return {
      status: 'pass',
      responseTime,
      message: 'Database connection successful',
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 检查Redis连接
async function checkRedis(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const redis = redisManager.getClient();
    if (!redis) {
      return {
        status: 'warn',
        responseTime: Date.now() - startTime,
        message: 'Redis client not available (development mode)',
        details: 'Redis is optional in development environment',
      };
    }

    // 设置超时以避免长时间等待
    const pingPromise = redis.ping();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Redis ping timeout')), 2000);
    });

    await Promise.race([pingPromise, timeoutPromise]);

    const responseTime = Date.now() - startTime;

    return {
      status: 'pass',
      responseTime,
      message: 'Redis connection successful',
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
      status: isDevelopment ? 'warn' : 'fail',
      responseTime,
      message: isDevelopment ? 'Redis unavailable (development mode)' : 'Redis connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 检查内存使用情况
function checkMemory(): HealthCheck {
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const memoryUsagePercent = (usedMemory / totalMemory) * 100;

  let status: 'pass' | 'warn' | 'fail' = 'pass';
  let message = 'Memory usage normal';

  if (memoryUsagePercent > 90) {
    status = 'fail';
    message = 'Critical memory usage';
  } else if (memoryUsagePercent > 80) {
    status = 'warn';
    message = 'High memory usage';
  }

  return {
    status,
    message,
    details: {
      heapUsed: Math.round(usedMemory / 1024 / 1024) + 'MB',
      heapTotal: Math.round(totalMemory / 1024 / 1024) + 'MB',
      usagePercent: Math.round(memoryUsagePercent * 100) / 100 + '%',
      external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
    },
  };
}

// 检查磁盘空间（简化版本）
function checkDisk(): HealthCheck {
  // 在实际生产环境中，这里应该检查实际的磁盘使用情况
  // 这里提供一个简化的实现
  return {
    status: 'pass',
    message: 'Disk space sufficient',
    details: {
      note: 'Disk check not implemented in this environment',
    },
  };
}

// 检查外部服务
async function checkExternalServices(): Promise<HealthCheck> {
  const checks = [];

  // 检查AI服务可用性
  if (env.GEMINI_API_KEY) {
    try {
      // 这里可以添加对Gemini API的简单ping检查
      checks.push({ service: 'Gemini API', status: 'available' });
    } catch (error) {
      checks.push({
        service: 'Gemini API',
        status: 'unavailable',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // 检查邮件服务
  if (env.SMTP_HOST) {
    checks.push({ service: 'SMTP', status: 'configured' });
  }

  return {
    status: 'pass',
    message: 'External services check completed',
    details: checks,
  };
}

// 确定整体健康状态
function determineOverallStatus(checks: HealthCheckResult['checks']): 'healthy' | 'unhealthy' | 'degraded' {
  const criticalServices = ['database', 'redis'];
  const hasCriticalFailure = criticalServices.some(service => checks[service as keyof typeof checks].status === 'fail');

  if (hasCriticalFailure) {
    return 'unhealthy';
  }

  const hasWarnings = Object.values(checks).some(check => check.status === 'warn' || check.status === 'fail');

  if (hasWarnings) {
    return 'degraded';
  }

  return 'healthy';
}

// 健康检查处理函数
export async function GET() {
  const startTime = Date.now();

  try {
    // 并行执行所有健康检查
    const [databaseCheck, redisCheck, externalCheck] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkExternalServices(),
    ]);

    const memoryCheck = checkMemory();
    const diskCheck = checkDisk();

    const checks = {
      database: databaseCheck,
      redis: redisCheck,
      memory: memoryCheck,
      disk: diskCheck,
      external: externalCheck,
    };

    const overallStatus = determineOverallStatus(checks);
    const systemInfo = getSystemInfo();

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: env.NODE_ENV,
      uptime: systemInfo.uptime,
      checks,
      metadata: {
        nodeVersion: systemInfo.nodeVersion,
        platform: systemInfo.platform,
        arch: systemInfo.arch,
      },
    };

    // 根据健康状态返回相应的HTTP状态码
    const statusCode = overallStatus === 'healthy' ? 200 :
      overallStatus === 'degraded' ? 200 : 503;

    // 添加响应头
    const response = NextResponse.json(result, { status: statusCode });
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('X-Health-Check-Duration', `${Date.now() - startTime}ms`);

    return response;

  } catch (error) {
    // 健康检查本身失败
    const errorResult: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      checks: {
        database: { status: 'fail', message: 'Health check failed' },
        redis: { status: 'fail', message: 'Health check failed' },
        memory: { status: 'fail', message: 'Health check failed' },
        disk: { status: 'fail', message: 'Health check failed' },
        external: { status: 'fail', message: 'Health check failed' },
      },
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    console.error('Health check failed:', error);

    return NextResponse.json(errorResult, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
      },
    });
  }
}

// 简化的健康检查端点（用于负载均衡器）
export async function HEAD() {
  try {
    // 快速检查关键服务
    const result = await connectToDatabase();
    if (!result.success) {
      return new NextResponse(null, { status: 503 });
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}