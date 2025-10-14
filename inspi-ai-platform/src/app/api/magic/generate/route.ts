/**
 * AI教学魔法师 - 生成教学卡片API
 * 集成真实的Gemini AI服务
 */

import { NextResponse } from 'next/server';

import { geminiService } from '@/core/ai/geminiService';
import { generateAllCardsPrompt, validateAllCards } from '@/core/ai/promptTemplates';
import { requireAuth, AuthenticatedRequest } from '@/core/auth/middleware';
import { quotaManager } from '@/lib/quota/quotaManager';
import { validateContent, cleanUserContent } from '@/lib/security';
import type { GenerateCardsRequest, GenerateCardsResponse } from '@/shared/types/teaching';
import { logger } from '@/shared/utils/logger';


const SUPPORTED_PLANS = new Set(['free', 'pro', 'super']);

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

    logger.info('AI card generation request started', { userId, plan: userPlan });

    // 1. 解析请求体
    const body: GenerateCardsRequest = await request.json();
    const { knowledgePoint, subject, gradeLevel, difficulty, additionalContext } = body;

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

    // 4. 检查用户配额
    const canConsume = await quotaManager.consumeQuota(userId, userPlan, 1);
    if (!canConsume) {
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

    // 5. 检查AI服务健康状态
    const isHealthy = await geminiService.healthCheck();
    if (!isHealthy) {
      logger.error('AI service health check failed');
      return NextResponse.json(
        { error: 'AI服务暂时不可用，请稍后重试' },
        { status: 503 },
      );
    }

    // 6. 生成提示词上下文
    const promptContext = {
      knowledgePoint: cleanKnowledgePoint,
      subject: subject || '通用',
      gradeLevel: gradeLevel || '中学',
      language: '中文',
    };

    // 7. 生成四张卡片
    const cards = [];
    const cardTypes = ['concept', 'example', 'practice', 'extension'] as const;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    for (const cardType of cardTypes) {
      try {
        const prompt = generateAllCardsPrompt(promptContext)[cardType];

        const result = await geminiService.generateContent(prompt, {
          temperature: 0.7,
          maxTokens: 500,
          useCache: true,
          cacheKey: `card_${cardType}_${cleanKnowledgePoint}_${subject}`,
          cacheTTL: 3600, // 1小时缓存
        });

        // 对AI生成的内容进行安全验证和清理
        const aiContentValidation = await validateContent(result.content, {
          maxLength: 1000,
          enableXssFilter: true,
          enableSensitiveWordFilter: true,
          enableHtmlFilter: false, // AI生成的内容可能包含格式化标记
        });

        const cleanAIContent = aiContentValidation.isValid ?
          result.content :
          cleanUserContent(result.content);

        // 验证生成的内容
        const validation = validateAllCards({ [cardType]: result.content })[cardType];

        if (!validation.valid) {
          logger.warn(`Generated card validation failed for ${cardType}`, {
            errors: validation.errors,
            knowledgePoint,
          });
        }

        // 映射卡片类型到前端期望的格式
        const cardTypeMap = {
          concept: 'visualization',
          example: 'analogy',
          practice: 'thinking',
          extension: 'interaction',
        } as const;

        const cardTitleMap = {
          concept: '概念解释',
          example: '实例演示',
          practice: '练习巩固',
          extension: '拓展延伸',
        } as const;

        cards.push({
          id: `card_${sessionId}_${cardType}`,
          type: cardTypeMap[cardType],
          title: cardTitleMap[cardType],
          content: cleanAIContent,
          explanation: `AI生成的${cardTitleMap[cardType]}卡片，帮助理解"${cleanKnowledgePoint}"`,
          cached: result.cached,
        });

      } catch (error) {
        logger.error(`Failed to generate ${cardType} card`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          knowledgePoint: cleanKnowledgePoint,
          cardType,
        });

        // 生成失败时使用备用内容
        const fallbackContent = generateFallbackCard(cardType, cleanKnowledgePoint);
        cards.push(fallbackContent);
      }
    }

    // 8. 获取更新后的配额信息
    const updatedQuota = await quotaManager.checkQuota(userId, userPlan);
    const usage = {
      current: updatedQuota.currentUsage,
      limit: updatedQuota.dailyLimit,
      remaining: updatedQuota.remaining,
    };

    // 9. 构建响应
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
function generateFallbackCard(cardType: string, knowledgePoint: string) {
  const fallbackMap = {
    concept: {
      type: 'visualization' as const,
      title: '概念解释',
      content: `关于"${knowledgePoint}"的核心概念：\n\n这是一个重要的知识点，需要我们深入理解其基本含义和应用场景。通过系统学习和实践，我们可以更好地掌握相关内容。`,
      explanation: `概念解释卡片 - ${knowledgePoint}`,
    },
    example: {
      type: 'analogy' as const,
      title: '实例演示',
      content: `让我们通过具体例子来理解"${knowledgePoint}"：\n\n在实际应用中，这个概念有很多具体的体现。通过观察和分析这些例子，我们能更好地理解其实际意义。`,
      explanation: `实例演示卡片 - ${knowledgePoint}`,
    },
    practice: {
      type: 'thinking' as const,
      title: '练习巩固',
      content: `关于"${knowledgePoint}"的练习思考：\n\n1. 这个概念的核心要点是什么？\n2. 在什么情况下会用到它？\n3. 你能想到相关的例子吗？\n\n通过这些问题，加深对知识点的理解。`,
      explanation: `练习巩固卡片 - ${knowledgePoint}`,
    },
    extension: {
      type: 'interaction' as const,
      title: '拓展延伸',
      content: `"${knowledgePoint}"的拓展思考：\n\n这个知识点与其他概念有什么联系？在更广阔的知识体系中，它扮演什么角色？让我们一起探索更深层的内容。`,
      explanation: `拓展延伸卡片 - ${knowledgePoint}`,
    },
  };

  const fallback = fallbackMap[cardType as keyof typeof fallbackMap];
  return {
    id: `fallback_${cardType}_${Date.now()}`,
    ...fallback,
    cached: false,
  };
}
