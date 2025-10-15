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
import type {
  GenerateCardsRequest,
  GenerateCardsResponse,
  TeachingCard,
  CardSOPSection,
  CardPresentationMeta,
  CardPresentationCue,
} from '@/shared/types/teaching';
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

    const isMockMode = !process.env.GEMINI_API_KEY || process.env.USE_MOCK_GEMINI === 'true';

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
    if (!isMockMode) {
      const isHealthy = await geminiService.healthCheck();
      if (!isHealthy) {
        logger.error('AI service health check failed');
        return NextResponse.json(
          { error: 'AI服务暂时不可用，请稍后重试' },
          { status: 503 },
        );
      }
    }

    // 6. 生成提示词上下文
    const promptContext = {
      knowledgePoint: cleanKnowledgePoint,
      subject: subject || '通用',
      gradeLevel: gradeLevel || '中学',
      language: '中文',
    };

    // 7. 生成四张卡片
    const cards: TeachingCard[] = [];
    const cardTypes = ['concept', 'example', 'practice', 'extension'] as const;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    for (const cardType of cardTypes) {
      if (isMockMode) {
        cards.push(
          enrichCard(
            generateFallbackCard(cardType, cleanKnowledgePoint),
            cleanKnowledgePoint,
            subject,
            gradeLevel,
          ),
        );
        continue;
      }

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

        const cleanAIContent = aiContentValidation.isValid
          ? result.content
          : await cleanUserContent(result.content);

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

        const baseCard: TeachingCard = {
          id: `card_${sessionId}_${cardType}`,
          type: cardTypeMap[cardType],
          title: cardTitleMap[cardType],
          content: cleanAIContent,
          explanation: `AI生成的${cardTitleMap[cardType]}卡片，帮助理解“${cleanKnowledgePoint}”`,
          cached: result.cached,
        };

        cards.push(
          enrichCard(baseCard, cleanKnowledgePoint, subject, gradeLevel),
        );

      } catch (error) {
        logger.error(`Failed to generate ${cardType} card`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          knowledgePoint: cleanKnowledgePoint,
          cardType,
        });

        // 生成失败时使用备用内容
        const fallbackContent = generateFallbackCard(cardType, cleanKnowledgePoint);
        cards.push(
          enrichCard(fallbackContent, cleanKnowledgePoint, subject, gradeLevel),
        );
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

function enrichCard(
  card: TeachingCard,
  knowledgePoint: string,
  subject?: string,
  gradeLevel?: string,
): TeachingCard {
  return {
    ...card,
    metadata: {
      ...card.metadata,
      knowledgePoint,
      subject,
      gradeLevel,
      generatedAt: card.metadata?.generatedAt ?? new Date().toISOString(),
    },
    sop: card.sop ?? buildSOPSections(card.type, knowledgePoint),
    presentation: card.presentation ?? buildPresentationMeta(card.type, knowledgePoint),
  };
}

function buildSOPSections(cardType: TeachingCard['type'], knowledgePoint: string): CardSOPSection[] {
  const commonClosingStep = {
    title: '即时反馈',
    goal: '确认学生掌握度',
    teacherActions: '以口头问答或小测形式获取反馈，记录主要误区。',
    studentActions: '快速回答教师抛出的检核问题。',
    evidence: '80% 学生能够准确回答核心问题。',
    interactionMode: '全班',
    durationSeconds: 90,
  };

  const templates: Record<TeachingCard['type'], CardSOPSection[]> = {
    visualization: [
      {
        title: '场景引入',
        durationMinutes: 3,
        steps: [
          {
            title: '观察触发',
            goal: `激发对“${knowledgePoint}”的好奇与问题意识`,
            teacherActions: `展示与“${knowledgePoint}”相关的图像或动态演示，引导学生描述看到的元素。`,
            studentActions: '观察画面并说出最吸引注意的部分，提出疑问。',
            evidence: '至少两名学生能够主动分享观察与疑问。',
            interactionMode: '全班',
            durationSeconds: 120,
            differentiation: {
              basic: '提供关键词提示，引导学生描述。',
              advanced: '鼓励学生联系学过的相关概念。',
            },
          },
          {
            title: '结构拆解',
            goal: `帮助学生形成“${knowledgePoint}”的视觉化模型`,
            teacherActions: '用颜色或符号标注关键组成部分，说明各部分之间的关系。',
            studentActions: '在讲义或平板上描绘图示，标注出关键位置。',
            evidence: '学生能准确标出至少 3 个核心组成。',
            interactionMode: '小组',
            durationSeconds: 150,
          },
        ],
      },
      {
        title: '意义建构',
        durationMinutes: 4,
        steps: [
          {
            title: '概念连线',
            goal: `让学生用自己的语言解释“${knowledgePoint}”的含义`,
            teacherActions: '提问“如果把图中的关系换成文字，应如何描述？”',
            studentActions: '用一句话描述图示所表达的逻辑或过程。',
            evidence: '学生描述中包含核心概念与关系动词。',
            interactionMode: '同伴互评',
            durationSeconds: 120,
          },
          commonClosingStep,
        ],
      },
    ],
    analogy: [
      {
        title: '类比构建',
        durationMinutes: 3,
        steps: [
          {
            title: '生活投射',
            goal: `建立“${knowledgePoint}”与学生经验之间的桥梁`,
            teacherActions: `讲述一个贴近校园的故事，暗含“${knowledgePoint}”的逻辑。`,
            studentActions: '聆听故事并指出故事中的关键行为或结果。',
            evidence: '学生能指出与知识点对应的故事元素。',
            interactionMode: '全班',
            durationSeconds: 150,
          },
          {
            title: '结构映射',
            goal: '找出类比双方的对应关系',
            teacherActions: '板书双列表：生活情境 vs. 知识点要素。',
            studentActions: '补充或纠正对应关系，解释为什么匹配。',
            evidence: '学生能完成至少3组准确映射。',
            interactionMode: '小组',
            durationSeconds: 150,
          },
        ],
      },
      {
        title: '迁移应用',
        durationMinutes: 4,
        steps: [
          {
            title: '反向验证',
            goal: '检验学生能否将类比应用到新情境',
            teacherActions: '给出一个新案例，请学生判断类比是否成立。',
            studentActions: '在小组内讨论后作答，并说明理由。',
            evidence: '学生能说明成立或不成立的关键原因。',
            interactionMode: '小组/汇报',
            durationSeconds: 150,
          },
          commonClosingStep,
        ],
      },
    ],
    thinking: [
      {
        title: '问题抛掷',
        durationMinutes: 3,
        steps: [
          {
            title: '核心提问',
            goal: `引导学生围绕“${knowledgePoint}”进行高阶思考`,
            teacherActions: '抛出开放式问题，让学生进行头脑风暴。',
            studentActions: '写下初步观点或疑问，并与同伴交换。',
            evidence: '每个学习单上至少有一个原创观点。',
            interactionMode: '个人→同伴',
            durationSeconds: 120,
          },
          {
            title: '观点共享',
            goal: '促成观点碰撞与补充',
            teacherActions: '组织思维导图或便利贴展示，鼓励追问“为什么？”。',
            studentActions: '将观点贴到公共板面，并解释理由。',
            evidence: '形成至少两条互补或对立的观点链。',
            interactionMode: '小组汇报',
            durationSeconds: 150,
          },
        ],
      },
      {
        title: '观点打磨',
        durationMinutes: 4,
        steps: [
          {
            title: '证据补强',
            goal: '让学生学会用证据支撑观点',
            teacherActions: '提供数据片段或案例，请学生选择支撑材料。',
            studentActions: '在观点旁标注对应证据或示例。',
            evidence: '观点+证据配对完成度达到70%。',
            interactionMode: '小组协作',
            durationSeconds: 150,
          },
          commonClosingStep,
        ],
      },
    ],
    interaction: [
      {
        title: '氛围激活',
        durationMinutes: 3,
        steps: [
          {
            title: '热身活动',
            goal: '让学生快速进入合作状态',
            teacherActions: `安排与“${knowledgePoint}”相关的快速配对或投票活动。`,
            studentActions: '完成配对或投票，并表达理由。',
            evidence: '所有小组在限定时间内完成任务。',
            interactionMode: '全班/小组',
            durationSeconds: 120,
          },
          {
            title: '角色设定',
            goal: '明确合作分工',
            teacherActions: '为每位成员指定角色（如记录员、发言人）。',
            studentActions: '认领角色并说明职责。',
            evidence: '小组内角色分配清晰无争议。',
            interactionMode: '小组',
            durationSeconds: 120,
          },
        ],
      },
      {
        title: '协作展示',
        durationMinutes: 4,
        steps: [
          {
            title: '成果呈现',
            goal: '促成小组间互学',
            teacherActions: '提供展示模板或评分表，提示观众关注要点。',
            studentActions: '小组轮流分享成果，其他小组投票或提问。',
            evidence: '每个小组都收到至少一条建设性提问或反馈。',
            interactionMode: '跨组互动',
            durationSeconds: 180,
          },
          commonClosingStep,
        ],
      },
    ],
  };

  return templates[cardType];
}

function buildPresentationMeta(cardType: TeachingCard['type'], knowledgePoint: string): CardPresentationMeta {
  const baseHeadline = {
    visualization: `让“${knowledgePoint}”看得见`,
    analogy: `把“${knowledgePoint}”讲成故事`,
    thinking: `和“${knowledgePoint}”对话`,
    interaction: `一起玩转“${knowledgePoint}”`,
  };

  const baseSummary = {
    visualization: '用图像与结构化标记帮助学生建立直观认知。',
    analogy: '以生活故事对照概念，让抽象知识落地。',
    thinking: '通过高阶提问激活学生的批判思维。',
    interaction: '设计协作环节，维持课堂的能量与参与度。',
  };

  const cueTemplates: Record<TeachingCard['type'], CardPresentationCue[]> = {
    visualization: [
      {
        title: '开场提问',
        narrative: `展示核心图像，问学生：“如果这是${knowledgePoint}的世界，你最先注意什么？”`,
        emphasis: '引导观察',
        durationSeconds: 60,
      },
      {
        title: '结构拆解',
        narrative: '逐层放大图像，重点突出关系箭头或色块。',
        emphasis: '理清结构',
        durationSeconds: 120,
      },
      {
        title: '应用提醒',
        narrative: `指出“当看到这个特征，就联想到${knowledgePoint}的哪一部分”。`,
        emphasis: '建立记忆线索',
        durationSeconds: 90,
      },
    ],
    analogy: [
      {
        title: '故事引子',
        narrative: `用一句话讲出生活中的对应事件，与“${knowledgePoint}”形成悬念。`,
        emphasis: '营造代入感',
        durationSeconds: 75,
      },
      {
        title: '一一映射',
        narrative: '呈现双列表，每出现一个要素就让学生猜对应。',
        emphasis: '引导匹配',
        durationSeconds: 120,
      },
      {
        title: '迁移提问',
        narrative: '抛出“如果情境改成××，还适用吗？”',
        emphasis: '促进迁移',
        durationSeconds: 90,
      },
    ],
    thinking: [
      {
        title: '问题聚光',
        narrative: `屏幕仅显示问题关键词，让学生先独立写下对“${knowledgePoint}”的想法。`,
        emphasis: '静心思考',
        durationSeconds: 90,
      },
      {
        title: '观点对比',
        narrative: '以分屏方式展示两种观点，邀请学生站队。',
        emphasis: '观点碰撞',
        durationSeconds: 120,
      },
      {
        title: '证据强化',
        narrative: '展示关键数据或案例，询问“它支持谁？为什么？”',
        emphasis: '证据意识',
        durationSeconds: 90,
      },
    ],
    interaction: [
      {
        title: '任务揭晓',
        narrative: `用倒计时和动画公布与“${knowledgePoint}”相关的挑战任务。`,
        emphasis: '激活氛围',
        durationSeconds: 60,
      },
      {
        title: '协作提示',
        narrative: '展示分工表或评分表，提醒合作要点。',
        emphasis: '明确分工',
        durationSeconds: 120,
      },
      {
        title: '成果聚焦',
        narrative: '用投票或计分板收集结果，放大学生亮点。',
        emphasis: '即时鼓励',
        durationSeconds: 90,
      },
    ],
  };

  const callToActionMap = {
    visualization: '请学生在笔记中画出自己的理解图。',
    analogy: '邀请学生分享身边的类比案例。',
    thinking: '鼓励学生将问题带回家与家人讨论。',
    interaction: '提示学生在课后整理小组成果并分享。',
  };

  const recommendedDuration = {
    visualization: 4,
    analogy: 5,
    thinking: 5,
    interaction: 6,
  };

  return {
    headline: baseHeadline[cardType],
    summary: baseSummary[cardType],
    recommendedDuration: recommendedDuration[cardType],
    cues: cueTemplates[cardType],
    theme: cardType === 'visualization' || cardType === 'interaction' ? 'light' : 'dark',
    callToAction: callToActionMap[cardType],
  };
}

/**
 * 生成备用卡片内容
 */
function generateFallbackCard(cardType: string, knowledgePoint: string): TeachingCard {
  const fallbackMap = {
    concept: {
      type: 'visualization' as const,
      title: '概念解释',
      content: `关于“${knowledgePoint}”的核心概念：\n\n这是一个重要的知识点，需要我们深入理解其基本含义和应用场景。通过系统学习和实践，我们可以更好地掌握相关内容。`,
      explanation: `概念解释卡片 - ${knowledgePoint}`,
    },
    example: {
      type: 'analogy' as const,
      title: '实例演示',
      content: `让我们通过具体例子来理解“${knowledgePoint}”：\n\n在实际应用中，这个概念有很多具体的体现。通过观察和分析这些例子，我们能更好地理解其实际意义。`,
      explanation: `实例演示卡片 - ${knowledgePoint}`,
    },
    practice: {
      type: 'thinking' as const,
      title: '练习巩固',
      content: `关于“${knowledgePoint}”的练习思考：\n\n1. 这个概念的核心要点是什么？\n2. 在什么情况下会用到它？\n3. 你能想到相关的例子吗？\n\n通过这些问题，加深对知识点的理解。`,
      explanation: `练习巩固卡片 - ${knowledgePoint}`,
    },
    extension: {
      type: 'interaction' as const,
      title: '拓展延伸',
      content: `“${knowledgePoint}”的拓展思考：\n\n这个知识点与其他概念有什么联系？在更广阔的知识体系中，它扮演什么角色？让我们一起探索更深层的内容。`,
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
