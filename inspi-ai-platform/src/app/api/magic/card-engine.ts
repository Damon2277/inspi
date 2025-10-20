import { geminiService } from '@/core/ai/geminiService';
import { generatePrompt, PromptContext, validateCardContent } from '@/core/ai/promptTemplates';
import { cleanUserContent } from '@/lib/security';
import type {
  CardPresentationCue,
  CardPresentationMeta,
  CardSOPMicroStep,
  CardSOPSection,
  TeachingCard,
  VisualizationBranch,
  VisualizationSpec,
  VisualizationTheme,
  RawCardType,
} from '@/shared/types/teaching';
import { logger } from '@/shared/utils/logger';

export interface GenerateCardOptions {
  cardType: RawCardType;
  knowledgePoint: string;
  subject?: string;
  gradeLevel?: string;
  isMockMode: boolean;
  promptContext: PromptContext;
  sessionId: string;
}

const CARD_TYPE_MAP: Record<RawCardType, TeachingCard['type']> = {
  concept: 'visualization',
  example: 'analogy',
  practice: 'thinking',
  extension: 'interaction',
};

const CARD_TITLES: Record<RawCardType, string> = {
  concept: '概念可视化',
  example: '实例演示',
  practice: '练习巩固',
  extension: '拓展延伸',
};

const THEME_ORDER: VisualizationTheme[] = ['ocean', 'sunrise', 'forest', 'galaxy', 'neutral'];

export async function generateTeachingCard(options: GenerateCardOptions): Promise<TeachingCard> {
  const { cardType, knowledgePoint, subject, gradeLevel, isMockMode, promptContext, sessionId } = options;

  if (isMockMode) {
    return enrichCard(
      generateFallbackCard(cardType, knowledgePoint),
      knowledgePoint,
      subject,
      gradeLevel,
    );
  }

  try {
    const prompt = generatePrompt(cardType, promptContext);
    const cacheKey = `card_${cardType}_${knowledgePoint}_${subject || 'general'}`;

    const result = await geminiService.generateContent(prompt, {
      temperature: cardType === 'concept' ? 0.4 : 0.7,
      maxTokens: cardType === 'concept' ? 750 : 520,
      useCache: true,
      cacheKey,
      cacheTTL: 3600,
    });

    const processed = await buildCardFromAIResponse({
      rawContent: result.content,
      cardType,
      knowledgePoint,
      subject,
      gradeLevel,
      sessionId,
      cached: result.cached,
    });

    return processed;
  } catch (error) {
    logger.warn('generateTeachingCard failed, fallback used', {
      cardType,
      knowledgePoint,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return enrichCard(
      generateFallbackCard(cardType, knowledgePoint),
      knowledgePoint,
      subject,
      gradeLevel,
    );
  }
}

interface BuildCardParams {
  rawContent: string;
  cardType: RawCardType;
  knowledgePoint: string;
  subject?: string;
  gradeLevel?: string;
  sessionId: string;
  cached: boolean;
}

async function buildCardFromAIResponse(params: BuildCardParams): Promise<TeachingCard> {
  const { rawContent, cardType, knowledgePoint, subject, gradeLevel, sessionId, cached } = params;

  const validation = validateCardContent(cardType, rawContent);
  if (!validation.valid) {
    logger.debug('AI response did not pass validation', {
      cardType,
      errors: validation.errors,
    });
  }

  if (cardType === 'concept') {
    const { summary, visual } = await parseVisualizationJSON(rawContent, knowledgePoint);

    const baseCard: TeachingCard = {
      id: `card_${sessionId}_${cardType}`,
      type: CARD_TYPE_MAP[cardType],
      title: CARD_TITLES[cardType],
      content: summary,
      explanation: `围绕“${knowledgePoint}”的概念可视化，帮助学生建立直观模型。`,
      visual,
      cached,
    };

    return enrichCard(baseCard, knowledgePoint, subject, gradeLevel);
  }

  const sanitizedContent = await cleanUserContent(rawContent);

  const baseCard: TeachingCard = {
    id: `card_${sessionId}_${cardType}`,
    type: CARD_TYPE_MAP[cardType],
    title: CARD_TITLES[cardType],
    content: sanitizedContent,
    explanation: `${CARD_TITLES[cardType]}卡片 - ${knowledgePoint}`,
    cached,
  };

  return enrichCard(baseCard, knowledgePoint, subject, gradeLevel);
}

async function parseVisualizationJSON(
  rawContent: string,
  knowledgePoint: string,
): Promise<{ summary: string; visual: VisualizationSpec }> {
  const jsonPayload = extractJSON(rawContent);

  if (!jsonPayload) {
    logger.warn('Visualization payload missing JSON, using fallback');
    return buildVisualizationFallback(knowledgePoint);
  }

  try {
    const parsed = JSON.parse(jsonPayload);

    const summary = await cleanUserContent(parsed.summary || `抓住“${knowledgePoint}”的核心脉络。`);

    const theme = normalizeTheme(parsed.visual?.theme);
    const branchesInput = Array.isArray(parsed.visual?.branches)
      ? parsed.visual.branches.slice(0, 6)
      : [];

    if (branchesInput.length === 0) {
      return buildVisualizationFallback(knowledgePoint);
    }

    const branches: VisualizationBranch[] = [];
    for (let index = 0; index < branchesInput.length; index += 1) {
      const branch = branchesInput[index];
      const id = typeof branch?.id === 'string' && branch.id.trim().length > 0
        ? branch.id.trim()
        : `branch-${index + 1}`;

      const title = await cleanUserContent(branch?.title || `要点${index + 1}`);
      const summaryText = await cleanUserContent(branch?.summary || '');
      const keywords = Array.isArray(branch?.keywords)
        ? await Promise.all(
            branch.keywords
              .filter((word: unknown) => typeof word === 'string')
              .slice(0, 3)
              .map((word: string) => cleanUserContent(word)),
          )
        : [];

      const icon = typeof branch?.icon === 'string' && branch.icon.trim().length <= 4
        ? branch.icon.trim()
        : THEMATIC_ICONS[index % THEMATIC_ICONS.length];

      const color = typeof branch?.color === 'string' && branch.color.trim().length > 0
        ? branch.color.trim()
        : undefined;

      branches.push({
        id,
        title,
        summary: summaryText,
        keywords,
        icon,
        color,
      });
    }

    if (branches.length === 0) {
      return buildVisualizationFallback(knowledgePoint);
    }

    const centerTitle = await cleanUserContent(parsed.visual?.center?.title || knowledgePoint);
    const subtitle = parsed.visual?.center?.subtitle
      ? await cleanUserContent(parsed.visual.center.subtitle)
      : `理解“${knowledgePoint}”的结构与重点`;

    const footerNote = parsed.visual?.footerNote
      ? await cleanUserContent(parsed.visual.footerNote)
      : undefined;

    const visualSpec: VisualizationSpec = {
      type: 'concept-map',
      theme,
      center: {
        title: centerTitle,
        subtitle,
      },
      branches,
      footerNote,
    };

    return {
      summary,
      visual: visualSpec,
    };
  } catch (error) {
    logger.warn('Failed to parse visualization JSON', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return buildVisualizationFallback(knowledgePoint);
  }
}

function extractJSON(content: string): string | null {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const codeBlockMatch = content.match(/```json([\s\S]*?)```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

async function buildVisualizationFallback(knowledgePoint: string): Promise<{
  summary: string;
  visual: VisualizationSpec;
}> {
  const summary = await cleanUserContent(`用图示梳理“${knowledgePoint}”的核心要素，帮助学生建立整体认知。`);
  const fallbackBranches: VisualizationBranch[] = [
    {
      id: 'definition',
      title: '核心定义',
      summary: await cleanUserContent(`${knowledgePoint}的基本含义与关键对象。`),
      keywords: ['定义', '要素'],
      icon: '📘',
    },
    {
      id: 'features',
      title: '关键特征',
      summary: await cleanUserContent('列出最能代表该概念的3个特征。'),
      keywords: ['特征', '指标'],
      icon: '🔍',
    },
    {
      id: 'application',
      title: '应用场景',
      summary: await cleanUserContent('学习时常见的情境或生活应用案例。'),
      keywords: ['应用', '场景'],
      icon: '🧭',
    },
    {
      id: 'memory',
      title: '记忆线索',
      summary: await cleanUserContent('提供好记的口诀或联想帮助记忆。'),
      keywords: ['记忆', '联想'],
      icon: '🧠',
    },
  ];

  const visualSpec: VisualizationSpec = {
    type: 'concept-map',
    theme: 'neutral',
    center: {
      title: knowledgePoint,
      subtitle: '围绕中心概念展开的关联要素',
    },
    branches: fallbackBranches,
    footerNote: undefined,
  };

  return {
    summary,
    visual: visualSpec,
  };
}

function normalizeTheme(theme: unknown): VisualizationTheme {
  if (typeof theme !== 'string') return 'neutral';
  const lowered = theme.toLowerCase();
  if (THEME_ORDER.includes(lowered as VisualizationTheme)) {
    return lowered as VisualizationTheme;
  }
  return 'neutral';
}

const THEMATIC_ICONS = ['🌟', '🔍', '🧠', '🧭', '🛠️', '📈'];

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
    visual: card.visual, // 保留视觉化数据
  };
}

function buildSOPSections(cardType: TeachingCard['type'], knowledgePoint: string): CardSOPSection[] {
  const commonClosingStep: CardSOPMicroStep = {
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

function generateFallbackCard(cardType: RawCardType, knowledgePoint: string): TeachingCard {
  const fallbackMap: Record<RawCardType, TeachingCard> = {
    concept: {
      id: `fallback_concept_${Date.now()}`,
      type: 'visualization',
      title: '概念可视化',
      content: `围绕“${knowledgePoint}”的核心结构一览。`,
      explanation: `概念解释卡片 - ${knowledgePoint}`,
      visual: {
        type: 'concept-map',
        theme: 'neutral',
        center: {
          title: knowledgePoint,
          subtitle: '理解核心、特征、应用与记忆线索',
        },
        branches: [
          {
            id: 'definition',
            title: '核心定义',
            summary: `${knowledgePoint}的基本含义`,
            keywords: ['概念', '定义'],
            icon: '📘',
          },
          {
            id: 'feature',
            title: '关键特征',
            summary: '记住最能代表该概念的三个特征。',
            keywords: ['特征', '指标'],
            icon: '🔍',
          },
          {
            id: 'application',
            title: '应用场景',
            summary: '举例说明在课堂或生活中的应用。',
            keywords: ['应用', '例子'],
            icon: '🧭',
          },
          {
            id: 'memory',
            title: '记忆线索',
            summary: '提供口诀/联想帮助学生记忆。',
            keywords: ['记忆', '方法'],
            icon: '🧠',
          },
        ],
      },
      cached: false,
    },
    example: {
      id: `fallback_example_${Date.now()}`,
      type: 'analogy',
      title: '实例演示',
      content: `聚焦与“${knowledgePoint}”最贴近的生活情境，借助下方流程快速唤起直观感受。`,
      explanation: `实例演示卡片 - ${knowledgePoint}`,
      visual: {
        type: 'process-flow',
        theme: 'sunrise',
        center: {
          title: `${knowledgePoint} 场景映射`,
          subtitle: '从熟悉体验到知识抽象',
        },
        branches: [
          {
            id: 'anchor',
            title: '熟悉体验',
            summary: '选择学生已经经历过的真实场景作为切入点。',
            keywords: ['联想', '体验'],
            icon: '🏠',
          },
          {
            id: 'transition',
            title: '观察要素',
            summary: '拆分场景中的关键人物、工具或步骤，对应知识点的核心变量。',
            keywords: ['要素', '变量'],
            icon: '🔍',
          },
          {
            id: 'mapping',
            title: '一一映射',
            summary: '将场景元素与知识点概念建立匹配关系，形成“像……就像……”的结构。',
            keywords: ['映射', '结构'],
            icon: '🧭',
          },
          {
            id: 'transfer',
            title: '迁移提问',
            summary: '抛出“如果换成……会怎样”的问题，引导学生从类比走向知识迁移。',
            keywords: ['迁移', '提问'],
            icon: '🚀',
          },
        ],
        footerNote: '提示：请根据自身班级情况替换示例场景，保持情境新鲜感。',
      },
      cached: false,
    },
    practice: {
      id: `fallback_practice_${Date.now()}`,
      type: 'thinking',
      title: '练习巩固',
      content: '优先使用视觉化练习矩阵，帮助学生快速定位到适合自己的训练任务。',
      explanation: `练习巩固卡片 - ${knowledgePoint}`,
      visual: {
        type: 'matrix',
        theme: 'forest',
        center: {
          title: `${knowledgePoint} 练习矩阵`,
          subtitle: '难度 × 应用场景',
        },
        branches: [
          {
            id: 'basic-understanding',
            title: '基础理解',
            summary: '识别概念核心特征，完成判断/选择类题目。',
            keywords: ['识别', '判断'],
            icon: '🧩',
          },
          {
            id: 'procedural',
            title: '步骤演练',
            summary: '按列出的 SOP 操作一次，强调步骤顺序与关键提示。',
            keywords: ['步骤', 'SOP'],
            icon: '🛠️',
          },
          {
            id: 'applied-case',
            title: '情境应用',
            summary: '将知识点嵌入新情境，完成小组讨论或情境题。',
            keywords: ['应用', '情境'],
            icon: '🎯',
          },
          {
            id: 'reflection',
            title: '错误诊断',
            summary: '分析常见错因，记录“为什么会错”以及纠正策略。',
            keywords: ['纠错', '反思'],
            icon: '🩺',
          },
        ],
        footerNote: '横轴：学生掌握度；纵轴：课堂时间投入。选择最匹配的任务作为课堂练习。',
      },
      cached: false,
    },
    extension: {
      id: `fallback_extension_${Date.now()}`,
      type: 'interaction',
      title: '拓展延伸',
      content: `结合互动设计盘点“${knowledgePoint}”的拓展路径，优先展示可直接用于课堂的互动结构。`,
      explanation: `拓展延伸卡片 - ${knowledgePoint}`,
      visual: {
        type: 'concept-map',
        theme: 'galaxy',
        center: {
          title: `${knowledgePoint} 拓展路线`,
          subtitle: '互动方式 × 教学目标',
        },
        branches: [
          {
            id: 'warmup',
            title: '情境唤醒',
            summary: '用故事或快问快答激活学生背景知识。',
            keywords: ['导入', '互动'],
            icon: '🎬',
          },
          {
            id: 'collaboration',
            title: '小组共创',
            summary: '设置分工明确的小组任务，输出可展示的成果。',
            keywords: ['分组', '共创'],
            icon: '🤝',
          },
          {
            id: 'challenge',
            title: '挑战升级',
            summary: '通过限时挑战或竞赛机制提升课堂张力。',
            keywords: ['竞赛', '激励'],
            icon: '⚡',
          },
          {
            id: 'reflection',
            title: '课堂共振',
            summary: '以讲评 + 迁移应用收束，连接下一节课或真实情境。',
            keywords: ['总结', '迁移'],
            icon: '📡',
          },
        ],
        footerNote: '提示：根据课堂节奏挑选 2-3 条支线展开，保持互动节奏。',
      },
      cached: false,
    },
  };

  return fallbackMap[cardType];
}

export { enrichCard, generateFallbackCard };
