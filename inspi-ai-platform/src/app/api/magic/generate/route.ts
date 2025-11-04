/**
 * AI教学魔法师 - 生成教学卡片API
 * 集成真实的Gemini AI服务
 */

import { NextResponse } from 'next/server';

import { aiProvider, aiService } from '@/core/ai/aiProvider';
import type { PromptContext } from '@/core/ai/promptTemplates';
import { requireAuth, AuthenticatedRequest } from '@/core/auth/middleware';
import connectDB from '@/lib/mongodb';
import { validateContent } from '@/lib/security';
import { QuotaService } from '@/services/quota.service';
import type {
  GenerateCardsRequest,
  GenerateCardsResponse,
  RawCardType,
  TeachingCard,
} from '@/shared/types/teaching';
import { logger } from '@/shared/utils/logger';

import { env } from '@/shared/config/environment';

import { generateTeachingCard } from '../card-engine';


const SUPPORTED_PLANS = new Set(['free', 'pro', 'super']);
const DEFAULT_CARD_TYPES: RawCardType[] = ['concept', 'example', 'practice', 'extension'];
const CARD_TYPE_ALIASES: Record<string, RawCardType> = {
  concept: 'concept',
  visualization: 'concept',
  analogy: 'example',
  example: 'example',
  thinking: 'practice',
  practice: 'practice',
  interaction: 'extension',
  extension: 'extension',
  summary: 'extension',
};

const normalizeRequestedCardTypes = (
  requested: GenerateCardsRequest['cardTypes'],
): RawCardType[] => {
  if (!Array.isArray(requested)) {
    return DEFAULT_CARD_TYPES;
  }

  const normalized: RawCardType[] = [];

  requested.forEach((type) => {
    if (typeof type !== 'string') {
      return;
    }

    const key = type.trim().toLowerCase();
    const mapped = CARD_TYPE_ALIASES[key];

    if (mapped && !normalized.includes(mapped)) {
      normalized.push(mapped);
    }
  });

  return normalized.length > 0 ? normalized : DEFAULT_CARD_TYPES;
};

export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  const startTime = Date.now();

  try {
    const userId = request.user?.userId;
    if (!userId) {
      return NextResponse.json(
        { error: '用户未认证' },
        { status: 401 },
      );
    }

    const subscriptionPlan = request.user?.dbUser?.subscription?.plan;
    const userPlan = (typeof subscriptionPlan === 'string' && SUPPORTED_PLANS.has(subscriptionPlan))
      ? (subscriptionPlan as 'free' | 'pro' | 'super')
      : 'free';

    const isMockMode = (
      (aiProvider === 'deepseek' && !env.AI.DEEPSEEK_API_KEY) ||
      (aiProvider === 'gemini' && !env.AI.GEMINI_API_KEY) ||
      process.env.USE_MOCK_GEMINI === 'true'
    );

    logger.info('AI card generation request started', { userId, plan: userPlan });

    // 1. 解析请求体
    const body: GenerateCardsRequest = await request.json();
    const { knowledgePoint, subject, gradeLevel, difficulty, additionalContext, cardTypes } = body;

    // 2. 验证输入
    if (!knowledgePoint || knowledgePoint.trim().length === 0) {
      return NextResponse.json(
        { error: '请输入知识点' },
        { status: 400 },
      );
    }

    if (knowledgePoint.length > 100) {
      return NextResponse.json(
        { error: '知识点长度不能超过100个字符' },
        { status: 400 },
      );
    }

    // 3. 内容安全验证
    const contentValidation = await validateContent(knowledgePoint, {
      maxLength: 100,
      enableXssFilter: true,
      enableSensitiveWordFilter: true,
      enableHtmlFilter: true,
    });

    if (!contentValidation.isValid) {
      const errors = ['内容验证失败'];

      return NextResponse.json(
        {
          error: '输入内容包含不当信息',
          details: errors,
        },
        { status: 400 },
      );
    }

    // 使用清理后的内容
    const cleanKnowledgePoint = contentValidation.cleanContent;

    // 4. 检查用户配额 - 使用新的订阅系统
    await connectDB(); // 确保数据库连接
    const quotaCheck = await QuotaService.checkAndConsume(userId);

    if (!quotaCheck.allowed) {
      // 如果是免费用户额度用尽，返回提示升级的信息
      if (quotaCheck.quotaType === 'daily') {
        return NextResponse.json(
          {
            error: quotaCheck.reason || '今日免费额度已用尽',
            needSubscription: true,
            quota: {
              type: quotaCheck.quotaType,
              used: quotaCheck.limit - quotaCheck.remaining,
              remaining: quotaCheck.remaining,
              total: quotaCheck.limit,
            },
          },
          { status: 429 },
        );
      } else {
        // 订阅用户月度额度用尽
        return NextResponse.json(
          {
            error: quotaCheck.reason || '本月额度已用尽',
            quota: {
              type: quotaCheck.quotaType,
              used: quotaCheck.limit - quotaCheck.remaining,
              remaining: quotaCheck.remaining,
              total: quotaCheck.limit,
            },
          },
          { status: 429 },
        );
      }
    }

    logger.info('Quota consumed', { userId, plan: userPlan, amount: 1 });

    // 5. 检查AI服务健康状态
    if (!isMockMode) {
      const isHealthy = await aiService.healthCheck();
      if (!isHealthy) {
        logger.error('AI service health check failed');
        return NextResponse.json(
          { error: 'AI服务暂时不可用，请稍后重试' },
          { status: 503 },
        );
      }
    }

    // 6. 生成提示词上下文
    const normalizedDifficulty = (typeof difficulty === 'string' && ['easy', 'medium', 'hard'].includes(difficulty.toLowerCase()))
      ? (difficulty.toLowerCase() as 'easy' | 'medium' | 'hard')
      : 'medium';

    const promptContext: PromptContext = {
      knowledgePoint: cleanKnowledgePoint,
      subject: subject || '通用',
      gradeLevel: gradeLevel || '中学',
      language: '中文',
      difficulty: normalizedDifficulty,
      additionalContext: additionalContext || undefined,
    };

    // 7. 确定需要生成的卡片类型
    const requestedCardTypes = normalizeRequestedCardTypes(cardTypes);

    // 8. 生成卡片
    const cards: TeachingCard[] = [];
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    for (const cardType of requestedCardTypes) {
      const card = await generateTeachingCard({
        cardType,
        knowledgePoint: cleanKnowledgePoint,
        subject,
        gradeLevel,
        isMockMode,
        promptContext,
        sessionId,
      });

      cards.push(card);
    }

    // 9. 获取更新后的配额信息
    const quotaStatus = await QuotaService.getQuotaStatus(userId);
    const usage = {
      current: quotaStatus.quota.used,
      limit: quotaStatus.quota.total,
      remaining: quotaStatus.quota.remaining,
    };

    // 10. 构建响应
    const response: GenerateCardsResponse = {
      cards,
      sessionId,
      usage,
    };

    const duration = Date.now() - startTime;
    logger.info('AI card generation completed', {
      userId,
      knowledgePoint: cleanKnowledgePoint,
      subject,
      cardsGenerated: cards.length,
      duration,
      sessionId,
    });

    return NextResponse.json(response);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('AI card generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    if (error instanceof Error) {
      // 处理特定错误类型
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return NextResponse.json(
          { error: 'AI服务配额已用完，请稍后重试或升级账户' },
          { status: 429 },
        );
      }

      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'AI服务响应超时，请重试' },
          { status: 408 },
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'AI生成服务暂时不可用，请稍后重试' },
      { status: 500 },
    );
  }
});

/**
 * 生成备用卡片内容
 */
