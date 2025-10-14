/**
 * AI教学卡片生成API端点
 * 创建/api/ai/generate-card端点，实现请求参数验证和响应格式化
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { cardGenerator, CardType, CardGenerationOptions } from '@/core/ai/card-generator';
import { contentSafetyValidator } from '@/core/ai/content-safety';
import { logger } from '@/shared/utils/logger';

// 请求验证schema
const generateCardRequestSchema = z.object({
  type: z.enum([CardType.CONCEPT, CardType.EXAMPLE, CardType.PRACTICE, CardType.SUMMARY]),
  subject: z.string().min(1).max(50),
  topic: z.string().min(1).max(100),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  language: z.string().optional().default('zh-CN'),
  targetAudience: z.string().optional(),
  learningObjectives: z.array(z.string()).optional(),
  customization: z.object({
    tone: z.enum(['formal', 'casual', 'friendly']).optional(),
    style: z.enum(['detailed', 'concise', 'interactive']).optional(),
    includeExamples: z.boolean().optional(),
    includeQuestions: z.boolean().optional(),
  }).optional(),
  safetyCheck: z.boolean().optional().default(true),
});

// 配额管理
class QuotaManager {
  private static instance: QuotaManager;
  private quotaCache = new Map<string, { count: number; resetTime: number }>();

  static getInstance(): QuotaManager {
    if (!QuotaManager.instance) {
      QuotaManager.instance = new QuotaManager();
    }
    return QuotaManager.instance;
  }

  async checkQuota(userId: string, tier: 'free' | 'premium' | 'enterprise' = 'free'): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    limit: number;
  }> {
    const limits = {
      free: 10,        // 每小时10次
      premium: 100,    // 每小时100次
      enterprise: 1000, // 每小时1000次
    };

    const limit = limits[tier];
    const now = Date.now();
    const hourStart = Math.floor(now / 3600000) * 3600000;
    const resetTime = hourStart + 3600000;

    const key = `${userId}_${hourStart}`;
    const current = this.quotaCache.get(key) || { count: 0, resetTime };

    // 清理过期数据
    if (current.resetTime <= now) {
      this.quotaCache.delete(key);
      current.count = 0;
      current.resetTime = resetTime;
    }

    const allowed = current.count < limit;
    const remaining = Math.max(0, limit - current.count);

    if (allowed) {
      current.count++;
      this.quotaCache.set(key, current);
    }

    return { allowed, remaining, resetTime, limit };
  }
}

// API调用监控
class APIMonitor {
  private static instance: APIMonitor;
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    totalResponseTime: 0,
  };

  static getInstance(): APIMonitor {
    if (!APIMonitor.instance) {
      APIMonitor.instance = new APIMonitor();
    }
    return APIMonitor.instance;
  }

  recordRequest(success: boolean, responseTime: number, metadata?: any): void {
    this.metrics.totalRequests++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // 记录详细日志
    logger.info('API调用记录', {
      success,
      responseTime,
      totalRequests: this.metrics.totalRequests,
      successRate: (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%',
      averageResponseTime: this.metrics.averageResponseTime.toFixed(2) + 'ms',
      ...metadata,
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0
        ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100)
        : 0,
      errorRate: this.metrics.totalRequests > 0
        ? (this.metrics.failedRequests / this.metrics.totalRequests * 100)
        : 0,
    };
  }
}

const quotaManager = QuotaManager.getInstance();
const apiMonitor = APIMonitor.getInstance();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let requestId: string | undefined;

  try {
    // 生成请求ID
    requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 获取用户信息（这里简化处理，实际应该从认证中获取）
    const userId = request.headers.get('x-user-id') || 'anonymous';
    const userTier = (request.headers.get('x-user-tier') as 'free' | 'premium' | 'enterprise') || 'free';

    logger.info('收到卡片生成请求', {
      requestId,
      userId,
      userTier,
      userAgent: request.headers.get('user-agent'),
    });

    // 检查配额
    const quotaResult = await quotaManager.checkQuota(userId, userTier);
    if (!quotaResult.allowed) {
      logger.warn('配额超限', {
        requestId,
        userId,
        remaining: quotaResult.remaining,
        resetTime: new Date(quotaResult.resetTime).toISOString(),
      });

      return NextResponse.json(
        {
          error: 'Quota exceeded',
          message: '已达到使用配额限制',
          quota: {
            remaining: quotaResult.remaining,
            resetTime: quotaResult.resetTime,
            limit: quotaResult.limit,
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': quotaResult.limit.toString(),
            'X-RateLimit-Remaining': quotaResult.remaining.toString(),
            'X-RateLimit-Reset': quotaResult.resetTime.toString(),
            'Retry-After': Math.ceil((quotaResult.resetTime - Date.now()) / 1000).toString(),
          },
        },
      );
    }

    // 解析请求体
    const body = await request.json();

    // 验证请求数据
    const validationResult = generateCardRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn('请求参数验证失败', {
        requestId,
        errors: validationResult.error.issues,
        body: JSON.stringify(body),
      });

      apiMonitor.recordRequest(false, Date.now() - startTime, {
        requestId,
        error: 'validation_failed',
      });

      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          message: '请求参数不正确',
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const options: CardGenerationOptions = validationResult.data;

    // 生成卡片
    logger.info('开始生成卡片', {
      requestId,
      type: options.type,
      subject: options.subject,
      topic: options.topic,
    });

    const cardContent = await cardGenerator.generateCard(options);

    // 安全检查
    let safetyResult = null;
    if (options.safetyCheck) {
      logger.info('执行内容安全检查', { requestId, cardId: cardContent.id });

      safetyResult = await contentSafetyValidator.checkContentSafety(
        cardContent.content,
        {
          type: options.type,
          subject: options.subject,
          targetAudience: options.targetAudience,
        },
      );

      if (!safetyResult.isSafe) {
        logger.warn('内容安全检查未通过', {
          requestId,
          cardId: cardContent.id,
          riskLevel: safetyResult.riskLevel,
          violationCount: safetyResult.violations.length,
        });

        apiMonitor.recordRequest(false, Date.now() - startTime, {
          requestId,
          error: 'safety_check_failed',
          riskLevel: safetyResult.riskLevel,
        });

        return NextResponse.json(
          {
            error: 'Content safety check failed',
            message: '生成的内容未通过安全检查',
            safety: {
              riskLevel: safetyResult.riskLevel,
              score: safetyResult.score,
              violations: safetyResult.violations.map(v => ({
                type: v.type,
                severity: v.severity,
                description: v.description,
              })),
              suggestions: safetyResult.suggestions,
            },
          },
          { status: 422 },
        );
      }
    }

    // 内容质量评估
    const qualityScore = await contentSafetyValidator.evaluateContentQuality(
      cardContent.content,
      {
        type: options.type,
        subject: options.subject,
        targetAudience: options.targetAudience,
      },
    );

    const responseTime = Date.now() - startTime;

    // 记录成功请求
    apiMonitor.recordRequest(true, responseTime, {
      requestId,
      cardId: cardContent.id,
      type: options.type,
      qualityScore: qualityScore.overall,
      safetyScore: safetyResult?.score,
    });

    logger.info('卡片生成成功', {
      requestId,
      cardId: cardContent.id,
      responseTime,
      qualityScore: qualityScore.overall,
      safetyScore: safetyResult?.score || 'skipped',
    });

    // 构建响应
    const response = {
      success: true,
      data: {
        card: {
          id: cardContent.id,
          type: cardContent.type,
          title: cardContent.title,
          content: cardContent.content,
          metadata: cardContent.metadata,
          quality: cardContent.quality,
          createdAt: cardContent.createdAt,
        },
        quality: qualityScore,
        safety: safetyResult ? {
          checkId: safetyResult.checkId,
          isSafe: safetyResult.isSafe,
          riskLevel: safetyResult.riskLevel,
          score: safetyResult.score,
        } : null,
      },
      meta: {
        requestId,
        responseTime,
        quota: {
          remaining: quotaResult.remaining - 1,
          resetTime: quotaResult.resetTime,
          limit: quotaResult.limit,
        },
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, {
      headers: {
        'X-Request-ID': requestId,
        'X-Response-Time': responseTime.toString(),
        'X-RateLimit-Limit': quotaResult.limit.toString(),
        'X-RateLimit-Remaining': (quotaResult.remaining - 1).toString(),
        'X-RateLimit-Reset': quotaResult.resetTime.toString(),
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    // 记录失败请求
    apiMonitor.recordRequest(false, responseTime, {
      requestId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });

    logger.error('卡片生成API错误', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime,
    });

    // 根据错误类型返回适当的状态码
    let statusCode = 500;
    let errorMessage = '服务器内部错误';

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('quota') || message.includes('limit')) {
        statusCode = 429;
        errorMessage = '请求频率过高';
      } else if (message.includes('validation') || message.includes('invalid')) {
        statusCode = 400;
        errorMessage = '请求参数错误';
      } else if (message.includes('timeout')) {
        statusCode = 504;
        errorMessage = '请求超时';
      } else if (message.includes('not found')) {
        statusCode = 404;
        errorMessage = '资源未找到';
      }
    }

    return NextResponse.json(
      {
        error: 'Card generation failed',
        message: errorMessage,
        requestId,
        timestamp: new Date().toISOString(),
      },
      {
        status: statusCode,
        headers: {
          'X-Request-ID': requestId || 'unknown',
          'X-Response-Time': responseTime.toString(),
        },
      },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'types':
        // 获取支持的卡片类型
        const supportedTypes = cardGenerator.getSupportedCardTypes();
        const typeInfo = supportedTypes.map(type => ({
          type,
          info: cardGenerator.getTemplateInfo(type),
        }));

        return NextResponse.json({
          success: true,
          data: {
            supportedTypes: typeInfo,
          },
        });

      case 'metrics':
        // 获取API指标
        const metrics = apiMonitor.getMetrics();
        return NextResponse.json({
          success: true,
          data: {
            metrics,
            timestamp: new Date().toISOString(),
          },
        });

      case 'health':
        // 健康检查
        const healthStatus = {
          status: 'healthy',
          services: {
            cardGenerator: 'operational',
            contentSafety: 'operational',
            quotaManager: 'operational',
          },
          timestamp: new Date().toISOString(),
        };

        return NextResponse.json({
          success: true,
          data: healthStatus,
        });

      default:
        return NextResponse.json({
          success: true,
          data: {
            service: 'AI Card Generation API',
            version: '1.0.0',
            endpoints: {
              'POST /api/ai/generate-card': '生成教学卡片',
              'GET /api/ai/generate-card?action=types': '获取支持的卡片类型',
              'GET /api/ai/generate-card?action=metrics': '获取API指标',
              'GET /api/ai/generate-card?action=health': '健康检查',
            },
            documentation: '/docs/api/ai/generate-card',
          },
        });
    }

  } catch (error) {
    logger.error('获取API信息失败', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to get API information',
        message: '获取API信息失败',
      },
      { status: 500 },
    );
  }
}
