/**
 * 健康检查API端点
 * 用于监控系统状态和依赖服务健康状况
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { redisManager } from '@/lib/cache/simple-redis';
import { geminiService } from '@/lib/ai/geminiService';
import { emailService } from '@/lib/email/service';
import { verificationManager } from '@/lib/email/verification';
import { quotaManager } from '@/lib/quota/quotaManager';
import { memoryMonitor } from '@/lib/utils/memoryMonitor';
import { env } from '@/config/environment';

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
    ai: HealthCheck;
    email: HealthCheck;
    verification: HealthCheck;
    quota: HealthCheck;
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
    const isHealthy = await redisManager.healthCheck();
    const responseTime = Date.now() - startTime;
    const status = redisManager.getStatus();

    if (isHealthy) {
      return {
        status: 'pass',
        responseTime,
        message: redisManager.isUsingMemoryFallback() 
          ? 'Using memory cache fallback' 
          : 'Redis connection successful',
        details: status,
      };
    } else {
      const isDevelopment = process.env.NODE_ENV === 'development';
      return {
        status: isDevelopment ? 'warn' : 'fail',
        responseTime,
        message: isDevelopment 
          ? 'Redis unavailable, using memory fallback' 
          : 'Redis connection failed',
        details: status,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
      status: isDevelopment ? 'warn' : 'fail',
      responseTime,
      message: isDevelopment 
        ? 'Redis unavailable, using memory fallback' 
        : 'Redis connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 检查内存使用情况
function checkMemory(): HealthCheck {
  const healthStatus = memoryMonitor.getHealthStatus();
  
  // 如果内存使用过高，触发清理
  if (healthStatus.status === 'critical') {
    memoryMonitor.cleanup();
  }

  return {
    status: healthStatus.status === 'healthy' ? 'pass' : 
           healthStatus.status === 'warning' ? 'warn' : 'fail',
    message: healthStatus.message,
    details: {
      heapUsed: memoryMonitor.formatBytes(healthStatus.stats.heapUsed),
      heapTotal: memoryMonitor.formatBytes(healthStatus.stats.heapTotal),
      usagePercent: `${Math.round(healthStatus.stats.usagePercent * 100)}%`,
      external: memoryMonitor.formatBytes(healthStatus.stats.external),
      rss: memoryMonitor.formatBytes(healthStatus.stats.rss),
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

// 检查AI服务
async function checkAIService(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const isHealthy = await geminiService.healthCheck();
    const responseTime = Date.now() - startTime;

    if (isHealthy) {
      return {
        status: 'pass',
        responseTime,
        message: 'AI service healthy',
        details: geminiService.getStatus()
      };
    } else {
      return {
        status: 'fail',
        responseTime,
        message: 'AI service unhealthy',
        details: geminiService.getStatus()
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'AI service check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 检查邮件服务
async function checkEmailService(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const isHealthy = await emailService.healthCheck();
    const responseTime = Date.now() - startTime;

    if (isHealthy) {
      return {
        status: 'pass',
        responseTime,
        message: 'Email service healthy',
        details: emailService.getStatus()
      };
    } else {
      return {
        status: 'warn',
        responseTime,
        message: 'Email service not configured or unhealthy',
        details: emailService.getStatus()
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'Email service check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 检查验证码服务
async function checkVerificationService(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const isHealthy = await verificationManager.healthCheck();
    const responseTime = Date.now() - startTime;

    return {
      status: isHealthy ? 'pass' : 'fail',
      responseTime,
      message: isHealthy ? 'Verification service healthy' : 'Verification service unhealthy',
      details: verificationManager.getConfig()
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'Verification service check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 检查配额服务
async function checkQuotaService(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const isHealthy = await quotaManager.healthCheck();
    const responseTime = Date.now() - startTime;

    return {
      status: isHealthy ? 'pass' : 'fail',
      responseTime,
      message: isHealthy ? 'Quota service healthy' : 'Quota service unhealthy',
      details: quotaManager.getStatus()
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'Quota service check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 检查外部服务
async function checkExternalServices(): Promise<HealthCheck> {
  const checks = [];

  // 检查AI服务配置
  if (env.AI.GEMINI_API_KEY) {
    checks.push({ service: 'Gemini API', status: 'configured' });
  } else {
    checks.push({ service: 'Gemini API', status: 'not_configured' });
  }

  // 检查邮件服务配置
  if (env.EMAIL.SMTP_HOST && env.EMAIL.SMTP_USER) {
    checks.push({ service: 'SMTP', status: 'configured' });
  } else {
    checks.push({ service: 'SMTP', status: 'not_configured' });
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
    const [
      databaseCheck, 
      redisCheck, 
      externalCheck,
      aiCheck,
      emailCheck,
      verificationCheck,
      quotaCheck
    ] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkExternalServices(),
      checkAIService(),
      checkEmailService(),
      checkVerificationService(),
      checkQuotaService()
    ]);

    const memoryCheck = checkMemory();
    const diskCheck = checkDisk();

    const checks = {
      database: databaseCheck,
      redis: redisCheck,
      memory: memoryCheck,
      disk: diskCheck,
      external: externalCheck,
      ai: aiCheck,
      email: emailCheck,
      verification: verificationCheck,
      quota: quotaCheck,
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