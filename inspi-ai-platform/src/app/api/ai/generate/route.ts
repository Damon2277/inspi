/**
 * AI内容生成API端点
 * 提供统一的AI内容生成接口
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enhancedGeminiService } from '@/core/ai/enhanced-gemini-service';
import { logger } from '@/shared/utils/logger';

// 请求验证schema
const generateRequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
  options: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(4000).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().min(1).max(100).optional(),
    useCache: z.boolean().optional(),
    cacheKey: z.string().optional(),
    cacheTTL: z.number().min(60).max(86400).optional(), // 1分钟到1天
  }).optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let requestId: string | undefined;

  try {
    // 解析请求体
    const body = await request.json();

    // 验证请求数据
    const validationResult = generateRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn('Invalid AI generation request', {
        errors: validationResult.error.issues,
        body: JSON.stringify(body),
      });

      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { prompt, options = {} } = validationResult.data;

    // 检查服务可用性
    if (!enhancedGeminiService.isAvailable()) {
      logger.error('AI service not available');
      return NextResponse.json(
        { error: 'AI service not available' },
        { status: 503 },
      );
    }

    // 检查限流
    try {
      const rateLimitInfo = await enhancedGeminiService.getRateLimitInfo();
      logger.debug('Rate limit check', { remaining: rateLimitInfo.remaining });
    } catch (rateLimitError) {
      logger.warn('Rate limit exceeded', { error: rateLimitError });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: 60,
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        },
      );
    }

    // 生成内容
    const result = await enhancedGeminiService.generateContent(prompt, options);
    requestId = result.requestId;

    const duration = Date.now() - startTime;
    logger.info('AI generation API success', {
      requestId,
      duration,
      promptLength: prompt.length,
      responseLength: result.content.length,
      cached: result.cached,
    });

    // 返回结果
    return NextResponse.json({
      success: true,
      data: {
        content: result.content,
        model: result.model,
        cached: result.cached,
        requestId: result.requestId,
        usage: result.usage,
      },
      meta: {
        timestamp: result.timestamp,
        duration,
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('AI generation API error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    // 根据错误类型返回适当的状态码
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('invalid api key')) {
        return NextResponse.json(
          { error: 'AI service configuration error' },
          { status: 500 },
        );
      }

      if (message.includes('quota exceeded')) {
        return NextResponse.json(
          { error: 'AI service quota exceeded' },
          { status: 429 },
        );
      }

      if (message.includes('timeout')) {
        return NextResponse.json(
          { error: 'AI service timeout' },
          { status: 504 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 获取服务状态
    const status = enhancedGeminiService.getStatus();
    const isHealthy = await enhancedGeminiService.healthCheck();

    return NextResponse.json({
      service: 'AI Generation API',
      status: {
        ...status,
        healthy: isHealthy,
        timestamp: Date.now(),
      },
    });

  } catch (error) {
    logger.error('AI service status check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to get service status' },
      { status: 500 },
    );
  }
}
