/**
 * 数据库健康检查API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { healthManager } from '@/lib/monitoring/health';
import { logger } from '@/lib/logging/logger';

/**
 * GET /api/health/database - 获取数据库健康状态
 */
export async function GET(request: NextRequest) {
  try {
    const result = await healthManager.runCheck('database');
    
    logger.info('Database health check performed', {
      metadata: {
        status: result.status,
        duration: result.duration,
        message: result.message
      }
    });

    // 根据健康状态设置HTTP状态码
    let statusCode = 200;
    if (result.status === 'degraded') {
      statusCode = 200; // 降级但仍可用
    } else if (result.status === 'unhealthy') {
      statusCode = 503; // 服务不可用
    }

    return NextResponse.json({
      name: 'database',
      status: result.status,
      message: result.message,
      duration: result.duration,
      timestamp: result.timestamp,
      metadata: result.metadata
    }, { status: statusCode });
  } catch (error) {
    logger.error('Database health check failed', error instanceof Error ? error : new Error(String(error)));
    
    return NextResponse.json({
      name: 'database',
      status: 'unhealthy',
      message: 'Database health check failed',
      duration: 0,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}