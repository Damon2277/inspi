/**
 * Redis健康检查API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { healthManager } from '@/lib/monitoring/health';
import { logger } from '@/lib/logging/logger';

/**
 * GET /api/health/redis - 获取Redis健康状态
 */
export async function GET(request: NextRequest) {
  try {
    const result = await healthManager.runCheck('redis');
    
    logger.info('Redis health check performed', {
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
      name: 'redis',
      status: result.status,
      message: result.message,
      duration: result.duration,
      timestamp: result.timestamp,
      metadata: result.metadata
    }, { status: statusCode });
  } catch (error) {
    logger.error('Redis health check failed', error instanceof Error ? error : new Error(String(error)));
    
    return NextResponse.json({
      name: 'redis',
      status: 'unhealthy',
      message: 'Redis health check failed',
      duration: 0,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}