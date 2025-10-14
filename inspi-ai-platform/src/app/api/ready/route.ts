/**
 * 就绪检查API
 * 用于Kubernetes就绪探针，检查应用是否准备好接收流量
 */

import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/shared/utils/logger';

interface ReadinessStatus {
  ready: boolean
  timestamp: string
  checks: {
    database: boolean
    redis: boolean
    migrations: boolean
    dependencies: boolean
  }
  message: string
}

export async function GET(request: NextRequest) {
  try {
    // 执行就绪检查
    const checks = {
      database: await checkDatabaseReady(),
      redis: await checkRedisReady(),
      migrations: await checkMigrationsReady(),
      dependencies: await checkDependenciesReady(),
    };

    // 计算整体就绪状态
    const ready = Object.values(checks).every(check => check === true);

    const readinessStatus: ReadinessStatus = {
      ready,
      timestamp: new Date().toISOString(),
      checks,
      message: ready ? 'Application is ready' : 'Application is not ready',
    };

    const httpStatus = ready ? 200 : 503;

    return NextResponse.json(readinessStatus, { status: httpStatus });

  } catch (error) {
    logger.error('Readiness check failed', { error });

    return NextResponse.json({
      ready: false,
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
        redis: false,
        migrations: false,
        dependencies: false,
      },
      message: 'Readiness check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}

/**
 * 检查数据库是否就绪
 */
async function checkDatabaseReady(): Promise<boolean> {
  try {
    // 这里应该执行实际的数据库连接测试
    // 例如：执行一个简单的查询
    await new Promise(resolve => setTimeout(resolve, 10));
    return true;
  } catch (error) {
    logger.error('Database readiness check failed', { error });
    return false;
  }
}

/**
 * 检查Redis是否就绪
 */
async function checkRedisReady(): Promise<boolean> {
  try {
    // 这里应该执行实际的Redis连接测试
    // 例如：执行PING命令
    await new Promise(resolve => setTimeout(resolve, 5));
    return true;
  } catch (error) {
    logger.error('Redis readiness check failed', { error });
    return false;
  }
}

/**
 * 检查数据库迁移是否完成
 */
async function checkMigrationsReady(): Promise<boolean> {
  try {
    // 这里应该检查数据库迁移状态
    // 例如：查询迁移表确认所有迁移都已执行
    await new Promise(resolve => setTimeout(resolve, 5));
    return true;
  } catch (error) {
    logger.error('Migrations readiness check failed', { error });
    return false;
  }
}

/**
 * 检查依赖服务是否就绪
 */
async function checkDependenciesReady(): Promise<boolean> {
  try {
    // 这里应该检查外部依赖服务
    // 例如：检查第三方API、消息队列等
    await new Promise(resolve => setTimeout(resolve, 5));
    return true;
  } catch (error) {
    logger.error('Dependencies readiness check failed', { error });
    return false;
  }
}
