import { NextResponse } from 'next/server';

import { geminiService } from '@/core/ai/geminiService';
import type { PromptContext } from '@/core/ai/promptTemplates';
import { requireAuth, AuthenticatedRequest } from '@/core/auth/middleware';
import { quotaManager } from '@/lib/quota/quotaManager';
import { validateContent } from '@/lib/security';
import type { RegenerateCardRequest, RawCardType } from '@/shared/types/teaching';
import { logger } from '@/shared/utils/logger';

import { generateTeachingCard } from '../card-engine';

const SUPPORTED_PLANS = new Set(['free', 'pro', 'super']);
const CARD_TYPES = new Set<RawCardType>(['concept', 'example', 'practice', 'extension']);

export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  const startTime = Date.now();

  try {
    const userId = request.user?.userId;
    if (!userId) {
      return NextResponse.json({ error: '用户未认证' }, { status: 401 });
    }

    const body: RegenerateCardRequest = await request.json();
    const { cardType, knowledgePoint, subject, gradeLevel } = body;

    if (!CARD_TYPES.has(cardType)) {
      return NextResponse.json({ error: '不支持的卡片类型' }, { status: 400 });
    }

    if (!knowledgePoint || knowledgePoint.trim().length === 0) {
      return NextResponse.json({ error: '请输入知识点' }, { status: 400 });
    }

    if (knowledgePoint.length > 100) {
      return NextResponse.json({ error: '知识点长度不能超过100个字符' }, { status: 400 });
    }

    const validation = await validateContent(knowledgePoint, {
      maxLength: 100,
      enableXssFilter: true,
      enableSensitiveWordFilter: true,
      enableHtmlFilter: true,
    });

    if (!validation.isValid) {
      return NextResponse.json({ error: '输入内容包含不当信息' }, { status: 400 });
    }

    const cleanKnowledgePoint = validation.cleanContent;

    const subscriptionPlan = request.user?.dbUser?.subscription?.plan;
    const userPlan = (typeof subscriptionPlan === 'string' && SUPPORTED_PLANS.has(subscriptionPlan))
      ? (subscriptionPlan as 'free' | 'pro' | 'super')
      : 'free';

    const consumed = await quotaManager.consumeQuota(userId, userPlan, 1);
    if (!consumed) {
      const quota = await quotaManager.checkQuota(userId, userPlan);
      return NextResponse.json(
        {
          error: '今日AI生成次数已用完',
          quota: {
            current: quota.currentUsage,
            limit: quota.dailyLimit,
            remaining: quota.remaining,
            resetTime: quota.resetTime,
          },
        },
        { status: 429 },
      );
    }

    const isMockMode = !process.env.GEMINI_API_KEY || process.env.USE_MOCK_GEMINI === 'true';

    if (!isMockMode) {
      const isHealthy = await geminiService.healthCheck();
      if (!isHealthy) {
        logger.error('AI service health check failed (regenerate)');
        return NextResponse.json({ error: 'AI服务暂时不可用，请稍后重试' }, { status: 503 });
      }
    }

    const promptContext: PromptContext = {
      knowledgePoint: cleanKnowledgePoint,
      subject: subject || '通用',
      gradeLevel: gradeLevel || '中学',
      language: '中文',
      difficulty: 'medium',
    };

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const card = await generateTeachingCard({
      cardType,
      knowledgePoint: cleanKnowledgePoint,
      subject,
      gradeLevel,
      isMockMode,
      promptContext,
      sessionId,
    });

    const updatedQuota = await quotaManager.checkQuota(userId, userPlan);

    const duration = Date.now() - startTime;
    logger.info('AI card regeneration completed', {
      userId,
      knowledgePoint: cleanKnowledgePoint,
      cardType,
      duration,
    });

    return NextResponse.json({
      card,
      usage: {
        current: updatedQuota.currentUsage,
        limit: updatedQuota.dailyLimit,
        remaining: updatedQuota.remaining,
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('AI card regeneration failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      { error: '卡片重新生成失败，请稍后重试' },
      { status: 500 },
    );
  }
});
