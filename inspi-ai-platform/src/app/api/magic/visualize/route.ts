import { NextResponse } from 'next/server';

import { aiProvider, aiService } from '@/core/ai/aiProvider';
import type { PromptContext } from '@/core/ai/promptTemplates';
import { requireAuth, AuthenticatedRequest } from '@/core/auth/middleware';
import { quotaManager } from '@/lib/quota/quotaManager';
import { validateContent } from '@/lib/security';
import { env } from '@/shared/config/environment';
import type { VisualizationSpec } from '@/shared/types/teaching';
import { logger } from '@/shared/utils/logger';

import { generateTeachingCard } from '../card-engine';

const SUPPORTED_PLANS = new Set(['free', 'pro', 'super']);

export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  const startTime = Date.now();

  try {
    const userId = request.user?.userId;
    if (!userId) {
      return NextResponse.json({ error: '用户未认证' }, { status: 401 });
    }

    const body = await request.json();
    const { knowledgePoint, subject, gradeLevel } = body ?? {};

    if (typeof knowledgePoint !== 'string' || knowledgePoint.trim().length === 0) {
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
          },
        },
        { status: 429 },
      );
    }

    const isMockMode = (
      (aiProvider === 'deepseek' && !env.AI.DEEPSEEK_API_KEY)
      || (aiProvider === 'gemini' && !env.AI.GEMINI_API_KEY)
      || process.env.USE_MOCK_GEMINI === 'true'
    );

    if (!isMockMode) {
      const isHealthy = await aiService.healthCheck();
      if (!isHealthy) {
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

    const sessionId = `visual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const card = await generateTeachingCard({
      cardType: 'concept',
      knowledgePoint: cleanKnowledgePoint,
      subject,
      gradeLevel,
      isMockMode,
      promptContext,
      sessionId,
    });

    const visual: VisualizationSpec | undefined = card.visual;
    if (!visual) {
      throw new Error('未生成可用的辅助图示');
    }

    const updatedQuota = await quotaManager.checkQuota(userId, userPlan);

    logger.info('AI visual assist generation completed', {
      userId,
      knowledgePoint: cleanKnowledgePoint,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      visual,
      usage: {
        current: updatedQuota.currentUsage,
        limit: updatedQuota.dailyLimit,
        remaining: updatedQuota.remaining,
      },
    });
  } catch (error) {
    logger.error('AI visual assist generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: '辅助图示生成失败，请稍后再试' },
      { status: 500 },
    );
  }
});

