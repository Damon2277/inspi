/**
 * AI服务健康检查端点
 */

import { NextRequest, NextResponse } from 'next/server';

import { enhancedGeminiService } from '@/core/ai/enhanced-gemini-service';
import { logger } from '@/shared/utils/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 执行健康检查
    const isHealthy = await enhancedGeminiService.healthCheck();
    const status = enhancedGeminiService.getStatus();
    const duration = Date.now() - startTime;

    const healthData = {
      service: 'AI Service',
      healthy: isHealthy,
      status: isHealthy ? 'UP' : 'DOWN',
      checks: {
        configuration: status.configured,
        availability: status.available,
        connectivity: isHealthy,
      },
      details: {
        ...status,
        checkDuration: duration,
        timestamp: Date.now(),
      },
    };

    logger.info('AI service health check completed', {
      healthy: isHealthy,
      duration,
      configured: status.configured,
      available: status.available,
    });

    return NextResponse.json(healthData, {
      status: isHealthy ? 200 : 503,
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('AI service health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json({
      service: 'AI Service',
      healthy: false,
      status: 'DOWN',
      error: 'Health check failed',
      details: {
        checkDuration: duration,
        timestamp: Date.now(),
      },
    }, {
      status: 503,
    });
  }
}
