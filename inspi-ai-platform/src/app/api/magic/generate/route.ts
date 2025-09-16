/**
 * AI教学魔法师 - 生成教学卡片API
 * 集成真实的Gemini AI服务
 */

import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/ai/geminiService';
import { generateAllCardsPrompt, validateAllCards, cardTemplates } from '@/lib/ai/promptTemplates';
import { quotaManager } from '@/lib/quota/quotaManager';
import { logger } from '@/lib/utils/logger';
import type { GenerateCardsRequest, GenerateCardsResponse } from '@/types/teaching';

// Mock教学卡片数据
const mockCards = {
  数学: {
    '两位数加法': [
      {
        id: 'card-1',
        type: 'visualization' as const,
        title: '可视化理解',
        content: '想象一下，你有23个苹果，朋友又给了你15个苹果。我们可以用小方块来表示：\n\n🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦 (20个)\n🟦🟦🟦 (3个)\n\n🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨 (10个)\n🟨🟨🟨🟨🟨 (5个)\n\n先把十位相加：20 + 10 = 30\n再把个位相加：3 + 5 = 8\n最后合并：30 + 8 = 38',
        explanation: '通过视觉化的方式，让学生直观理解两位数加法的过程，先处理十位，再处理个位。'
      },
      {
        id: 'card-2',
        type: 'analogy' as const,
        title: '类比延展',
        content: '两位数加法就像整理玩具箱：\n\n🧸 个位数字像散落的小玩具\n📦 十位数字像装满玩具的盒子\n\n当我们计算23 + 15时：\n- 先数盒子：2盒 + 1盒 = 3盒\n- 再数散落的玩具：3个 + 5个 = 8个\n- 最后合起来：3盒8个玩具 = 38个玩具\n\n这样，复杂的数学变成了简单的整理游戏！',
        explanation: '用孩子熟悉的整理玩具场景来类比数学概念，降低理解难度。'
      },
      {
        id: 'card-3',
        type: 'thinking' as const,
        title: '启发思考',
        content: '🤔 思考时间：\n\n如果你在商店买东西：\n- 一本书23元\n- 一支笔15元\n\n问题1：你需要带多少钱？\n问题2：如果你带了50元，还剩多少钱？\n问题3：你能想出其他需要用到两位数加法的生活场景吗？\n\n💡 提示：想想你的年龄、身高、或者收集的卡片数量...',
        explanation: '通过实际生活场景引发思考，让学生主动探索数学在生活中的应用。'
      },
      {
        id: 'card-4',
        type: 'interaction' as const,
        title: '互动氛围',
        content: '🎮 数字接龙游戏：\n\n游戏规则：\n1. 老师说一个两位数（如23）\n2. 学生轮流说另一个两位数（如15）\n3. 全班一起计算结果（23 + 15 = 38）\n4. 下一轮从结果开始（38 + ?）\n\n🏆 挑战模式：\n- 看谁能最快说出正确答案\n- 尝试让结果正好等于100\n- 用手势表示十位和个位\n\n让数学变成快乐的游戏！',
        explanation: '通过游戏化的互动方式，提高学生参与度和学习兴趣。'
      }
    ],
    '分数概念': [
      {
        id: 'card-5',
        type: 'visualization' as const,
        title: '可视化理解',
        content: '🍕 分数就像分披萨：\n\n一整个披萨 = 1\n切成2块，每块是 1/2\n切成4块，每块是 1/4\n切成8块，每块是 1/8\n\n📊 用图形表示：\n⚪ = 1 (完整的圆)\n◐ = 1/2 (半个圆)\n◔ = 1/4 (四分之一圆)\n\n分母告诉我们分成几份，分子告诉我们取了几份。',
        explanation: '用披萨和图形直观展示分数概念，帮助学生理解分子分母的含义。'
      }
    ]
  },
  语文: {
    '文章主旨理解': [
      {
        id: 'card-6',
        type: 'visualization' as const,
        title: '可视化理解',
        content: '📖 理解文章主旨就像寻宝：\n\n🗺️ 文章 = 寻宝地图\n💎 主旨 = 宝藏位置\n🔍 关键词 = 寻宝线索\n\n寻宝步骤：\n1. 快速浏览全文（观察地图）\n2. 找出关键词句（收集线索）\n3. 思考作者想表达什么（推理宝藏位置）\n4. 用一句话概括（找到宝藏！）\n\n记住：主旨通常藏在开头、结尾或反复出现的地方！',
        explanation: '用寻宝游戏比喻阅读理解过程，让抽象的概念变得具体有趣。'
      }
    ]
  }
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.info('AI card generation request started');
    
    // 1. 身份验证
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body: GenerateCardsRequest = await request.json();
    const { knowledgePoint, subject, gradeLevel, difficulty, additionalContext } = body;

    // 3. 验证输入
    if (!knowledgePoint || knowledgePoint.trim().length === 0) {
      return NextResponse.json(
        { error: '请输入知识点' },
        { status: 400 }
      );
    }

    if (knowledgePoint.length > 100) {
      return NextResponse.json(
        { error: '知识点长度不能超过100个字符' },
        { status: 400 }
      );
    }

    // 4. 检查用户配额（简化版，实际应该从JWT中获取用户信息）
    const userId = 'temp_user_' + token.slice(-8); // 临时用户ID
    const userPlan = 'free'; // 临时设为免费用户
    
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
            resetTime: quota.resetTime
          }
        },
        { status: 429 }
      );
    }

    // 5. 检查AI服务健康状态
    const isHealthy = await geminiService.healthCheck();
    if (!isHealthy) {
      logger.error('AI service health check failed');
      return NextResponse.json(
        { error: 'AI服务暂时不可用，请稍后重试' },
        { status: 503 }
      );
    }

    // 6. 生成提示词上下文
    const promptContext = {
      knowledgePoint: knowledgePoint.trim(),
      subject: subject || '通用',
      gradeLevel: gradeLevel || '中学',
      difficulty: difficulty || 'medium',
      language: '中文',
      additionalContext
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
          cacheKey: `card_${cardType}_${knowledgePoint}_${subject}`,
          cacheTTL: 3600 // 1小时缓存
        });

        // 验证生成的内容
        const validation = validateAllCards({ [cardType]: result.content })[cardType];
        
        if (!validation.valid) {
          logger.warn(`Generated card validation failed for ${cardType}`, { 
            errors: validation.errors,
            knowledgePoint 
          });
        }

        // 映射卡片类型到前端期望的格式
        const cardTypeMap = {
          concept: 'visualization',
          example: 'analogy', 
          practice: 'thinking',
          extension: 'interaction'
        } as const;

        const cardTitleMap = {
          concept: '概念解释',
          example: '实例演示',
          practice: '练习巩固', 
          extension: '拓展延伸'
        } as const;

        cards.push({
          id: `card_${sessionId}_${cardType}`,
          type: cardTypeMap[cardType],
          title: cardTitleMap[cardType],
          content: result.content,
          explanation: `AI生成的${cardTitleMap[cardType]}卡片，帮助理解"${knowledgePoint}"`,
          cached: result.cached
        });

      } catch (error) {
        logger.error(`Failed to generate ${cardType} card`, { 
          error: error instanceof Error ? error.message : 'Unknown error',
          knowledgePoint,
          cardType
        });

        // 生成失败时使用备用内容
        const fallbackContent = generateFallbackCard(cardType, knowledgePoint);
        cards.push(fallbackContent);
      }
    }

    // 8. 获取更新后的配额信息
    const updatedQuota = await quotaManager.checkQuota(userId, userPlan);
    const usage = {
      current: updatedQuota.currentUsage,
      limit: updatedQuota.dailyLimit,
      remaining: updatedQuota.remaining
    };

    // 9. 构建响应
    const response: GenerateCardsResponse = {
      cards,
      sessionId,
      usage
    };

    const duration = Date.now() - startTime;
    logger.info('AI card generation completed', { 
      knowledgePoint,
      subject,
      cardsGenerated: cards.length,
      duration,
      sessionId
    });

    return NextResponse.json(response);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('AI card generation failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });
    
    if (error instanceof Error) {
      // 处理特定错误类型
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return NextResponse.json(
          { error: 'AI服务配额已用完，请稍后重试或升级账户' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'AI服务响应超时，请重试' },
          { status: 408 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'AI生成服务暂时不可用，请稍后重试' },
      { status: 500 }
    );
  }
}

/**
 * 生成备用卡片内容
 */
function generateFallbackCard(cardType: string, knowledgePoint: string) {
  const fallbackMap = {
    concept: {
      type: 'visualization' as const,
      title: '概念解释',
      content: `关于"${knowledgePoint}"的核心概念：\n\n这是一个重要的知识点，需要我们深入理解其基本含义和应用场景。通过系统学习和实践，我们可以更好地掌握相关内容。`,
      explanation: `概念解释卡片 - ${knowledgePoint}`
    },
    example: {
      type: 'analogy' as const,
      title: '实例演示', 
      content: `让我们通过具体例子来理解"${knowledgePoint}"：\n\n在实际应用中，这个概念有很多具体的体现。通过观察和分析这些例子，我们能更好地理解其实际意义。`,
      explanation: `实例演示卡片 - ${knowledgePoint}`
    },
    practice: {
      type: 'thinking' as const,
      title: '练习巩固',
      content: `关于"${knowledgePoint}"的练习思考：\n\n1. 这个概念的核心要点是什么？\n2. 在什么情况下会用到它？\n3. 你能想到相关的例子吗？\n\n通过这些问题，加深对知识点的理解。`,
      explanation: `练习巩固卡片 - ${knowledgePoint}`
    },
    extension: {
      type: 'interaction' as const,
      title: '拓展延伸',
      content: `"${knowledgePoint}"的拓展思考：\n\n这个知识点与其他概念有什么联系？在更广阔的知识体系中，它扮演什么角色？让我们一起探索更深层的内容。`,
      explanation: `拓展延伸卡片 - ${knowledgePoint}`
    }
  };

  const fallback = fallbackMap[cardType as keyof typeof fallbackMap];
  return {
    id: `fallback_${cardType}_${Date.now()}`,
    ...fallback,
    cached: false
  };
}