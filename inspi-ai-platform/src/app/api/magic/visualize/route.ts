import { NextResponse } from 'next/server';

import { aiProvider, aiService } from '@/core/ai/aiProvider';
import { requireAuth, AuthenticatedRequest } from '@/core/auth/middleware';
import { quotaManager } from '@/lib/quota/quotaManager';
import { cleanUserContent, validateContent } from '@/lib/security';
import { env } from '@/shared/config/environment';
import type { StructuredDiagramSpec, StructuredDiagramStage, VisualizationSpec } from '@/shared/types/teaching';
import { logger } from '@/shared/utils/logger';

const SUPPORTED_PLANS = new Set(['free', 'pro', 'super']);
const MAX_CARD_CONTENT_LENGTH = 2400;
const FALLBACK_THEME: VisualizationSpec['theme'] = 'neutral';
const FALLBACK_LAYOUT: VisualizationSpec['layout'] = 'left-to-right';
const FALLBACK_ICONS = ['🧭', '🧠', '🗣️', '🛠️', '✅'];

export const dynamic = 'force-dynamic';

interface VisualAssistContext {
  knowledgePoint: string;
  subject?: string;
  gradeLevel?: string;
  cardTitle?: string;
  cardType?: string;
  cardContent?: string;
}

export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  const startTime = Date.now();

  try {
    const userId = request.user?.userId;
    if (!userId) {
      return NextResponse.json({ error: '用户未认证' }, { status: 401 });
    }

    const body = await request.json();
    const { knowledgePoint, subject, gradeLevel, cardTitle, cardType, cardContent } = body ?? {};

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
        return NextResponse.json({ error: 'AI服务暂时不可用，请稍后再试' }, { status: 503 });
      }
    }

    const normalizedTitle = await sanitizeOptionalText(cardTitle);
    const normalizedType = await sanitizeOptionalText(cardType);
    const normalizedContent = await normalizeCardContent(typeof cardContent === 'string' ? cardContent : undefined);

    const context: VisualAssistContext = {
      knowledgePoint: cleanKnowledgePoint,
      subject,
      gradeLevel,
      cardTitle: normalizedTitle,
      cardType: normalizedType,
      cardContent: normalizedContent,
    };

    const diagramResult = await generateVisualAssistDiagram(context, isMockMode);
    const updatedQuota = await quotaManager.checkQuota(userId, userPlan);

    logger.info('AI visual assist generation completed', {
      userId,
      knowledgePoint: cleanKnowledgePoint,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      visual: diagramResult.visual,
      summary: diagramResult.summary,
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

async function generateVisualAssistDiagram(context: VisualAssistContext, isMockMode: boolean) {
  if (isMockMode) {
    return buildVisualAssistFallback(context);
  }

  try {
    const prompt = buildVisualAssistPrompt(context);
    const response = await aiService.generateContent(prompt, {
      temperature: 0.35,
      maxTokens: 950,
      useCache: false,
    });
    return await parseVisualAssistJSON(response.content, context);
  } catch (error) {
    logger.warn('Visual assist prompt failed, using fallback', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return buildVisualAssistFallback(context);
  }
}

function buildVisualAssistPrompt(context: VisualAssistContext) {
  const subjectLabel = context.subject || '通用学科';
  const gradeLabel = context.gradeLevel || '适用年级';
  const titleLabel = context.cardTitle || context.knowledgePoint;
  const typeLabel = context.cardType || '未指定类型';
  const contentBlock = context.cardContent
    ? context.cardContent
    : '（未提供额外卡片内容，可根据知识点生成常规教学步骤）';

  const promptLines = [
    '你是一名课堂视觉化教练，要把老师的教学卡片内容转为“辅助图示”。',
    '- 只针对给定卡片内容设计，不要重新生成概念解释。',
    '- 以 "structured-diagram" 形式输出，突出步骤、连接和师生动作。',
    '- JSON 中的 visual.type 必须是 "structured-diagram"。',
    '- stages 需要 3-5 个，围绕卡片内容给出标题、摘要、要点。',
    '- notes、highlight 提供给教学场景的提醒或连结。',
    '',
    '【输入】',
    `- 知识点：${context.knowledgePoint}`,
    `- 卡片标题：${titleLabel}`,
    `- 卡片类型：${typeLabel}`,
    `- 学科 / 年级：${subjectLabel} / ${gradeLabel}`,
    '- 卡片内容摘要：',
    contentBlock,
    '',
    '【输出 JSON 模板】',
    '{"summary":"一句话说明图示帮助","visual":{"type":"structured-diagram","theme":"neutral|ocean|sunrise|forest|galaxy","layout":"left-to-right|radial|grid|hierarchical","center":{"title":"主标题","subtitle":"一句说明"},"structured":{"header":{"title":"","subtitle":"","summary":"","conceptTagline":"可选","formula":"可选"},"stages":[{"id":"stage-1","title":"步骤标题","summary":"12-24字","details":["可选要点"],"icon":"🧠"}],"outcomes":[{"title":"产出","description":"可选","icon":"⭐️"}],"notes":["课堂提醒"],"highlight":"一句提醒"}},"footerNote":"提醒文本"}}',
    '仅输出 JSON。',
  ];

  return promptLines.join('\n');
}

async function parseVisualAssistJSON(rawContent: string, context: VisualAssistContext) {
  const payload = extractJSON(rawContent);
  if (!payload) {
    return buildVisualAssistFallback(context);
  }

  try {
    const data = JSON.parse(payload);
    const visual = data?.visual;
    if (!visual || !visual.structured) {
      throw new Error('missing structured diagram data');
    }
    return await buildStructuredVisualFromPayload(data, context);
  } catch (error) {
    logger.debug('Failed to parse visual assist payload', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return buildVisualAssistFallback(context);
  }
}

async function buildStructuredVisualFromPayload(payload: any, context: VisualAssistContext) {
  const rawVisual = payload.visual ?? {};
  const structuredInput = rawVisual.structured;
  const summary = await sanitizeRequiredText(payload.summary, defaultSummary(context));

  const headerTitle = await sanitizeRequiredText(
    structuredInput?.header?.title || rawVisual.center?.title,
    context.cardTitle || context.knowledgePoint,
  );
  const headerSubtitle = (await sanitizeOptionalText(structuredInput?.header?.subtitle || rawVisual.center?.subtitle))
    ?? defaultSubtitle(context);
  const headerSummary = (await sanitizeOptionalText(structuredInput?.header?.summary)) ?? summary;
  const header: StructuredDiagramSpec['header'] = {
    title: headerTitle,
    subtitle: headerSubtitle,
    summary: headerSummary,
  };
  const conceptTagline = await sanitizeOptionalText(structuredInput?.header?.conceptTagline);
  if (conceptTagline) {
    header.conceptTagline = conceptTagline;
  }
  const formula = await sanitizeOptionalText(structuredInput?.header?.formula);
  if (formula) {
    header.formula = formula;
  }

  const stages = await buildStageList(structuredInput?.stages, context);
  if (stages.length === 0) {
    throw new Error('missing stages');
  }

  const outcomes = await buildOutcomeList(structuredInput?.outcomes);
  const notes = await buildNotes(structuredInput?.notes);
  const highlight = await sanitizeOptionalText(structuredInput?.highlight);

  const structured: StructuredDiagramSpec = {
    header,
    stages,
  };
  if (outcomes?.length) {
    structured.outcomes = outcomes;
  }
  if (notes?.length) {
    structured.notes = notes;
  }
  if (highlight) {
    structured.highlight = highlight;
  }

  const visualSpec: VisualizationSpec = {
    type: 'structured-diagram',
    theme: normalizeTheme(rawVisual.theme),
    layout: normalizeLayout(rawVisual.layout),
    center: {
      title: headerTitle,
      subtitle: headerSubtitle,
    },
    branches: [],
    footerNote: (await sanitizeOptionalText(rawVisual.footerNote))
      ?? '辅助图示来自 Inspi.AI，请结合课堂调整。',
    structured,
  };

  applyStructuredDiagramImage(visualSpec);

  return { summary, visual: visualSpec };
}

async function buildStageList(stagesInput: any, context: VisualAssistContext): Promise<StructuredDiagramStage[]> {
  if (!Array.isArray(stagesInput)) {
    return [];
  }
  const sanitized = await Promise.all(
    stagesInput.slice(0, 5).map(async (stage: any, index: number) => {
      if (!stage || typeof stage !== 'object') {
        return null;
      }
      const title = await sanitizeRequiredText(stage.title, `步骤${index + 1}`);
      const summary = await sanitizeRequiredText(
        stage.summary,
        deriveStageFallbackSummary(context, index),
      );
      const details = await sanitizeStringList(stage.details, 4);
      const icon = await sanitizeEmoji(stage.icon);
      const normalized: StructuredDiagramStage = {
        id: typeof stage.id === 'string' && stage.id.trim().length > 0
          ? stage.id.trim()
          : `stage-${index + 1}`,
        title,
        summary,
      };
      if (details.length > 0) {
        normalized.details = details;
      }
      if (icon) {
        normalized.icon = icon;
      }
      return normalized;
    }),
  );

  return sanitized.filter(Boolean) as StructuredDiagramStage[];
}

async function buildOutcomeList(outcomeInput: any) {
  if (!Array.isArray(outcomeInput)) {
    return undefined;
  }
  const outcomes = await Promise.all(
    outcomeInput.slice(0, 3).map(async (item: any, index: number) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const title = await sanitizeRequiredText(item.title, `产出${index + 1}`);
      const description = await sanitizeOptionalText(item.description);
      const icon = await sanitizeEmoji(item.icon);
      return {
        title,
        description,
        icon,
      };
    }),
  );

  const filtered = outcomes.filter(Boolean);
  return filtered.length > 0 ? filtered : undefined;
}

async function buildNotes(notesInput: any) {
  if (!Array.isArray(notesInput)) {
    return undefined;
  }
  const notes = await Promise.all(notesInput.slice(0, 4).map(note => sanitizeOptionalText(note)));
  const filtered = notes.filter(Boolean) as string[];
  return filtered.length > 0 ? filtered : undefined;
}

async function buildVisualAssistFallback(context: VisualAssistContext) {
  const stageSources = deriveFallbackStageSources(context);
  const stages = await Promise.all(stageSources.map(async (source, index) => {
    const title = await sanitizeRequiredText(source.title, `步骤${index + 1}`);
    const summary = await sanitizeRequiredText(source.summary, deriveStageFallbackSummary(context, index));
    const details = await Promise.all((source.details || []).slice(0, 3).map(detail => sanitizeOptionalText(detail)));
    const filteredDetails = details.filter(Boolean) as string[];
    const stage: StructuredDiagramStage = {
      id: `fallback-stage-${index + 1}`,
      title,
      summary,
      icon: source.icon || FALLBACK_ICONS[index % FALLBACK_ICONS.length],
    };
    if (filteredDetails.length) {
      stage.details = filteredDetails;
    }
    return stage;
  }));

  const header: StructuredDiagramSpec['header'] = {
    title: context.cardTitle || context.knowledgePoint,
    subtitle: `${context.subject || '课堂'}辅助图示`,
    summary: `围绕“${context.knowledgePoint}”的课堂提示`,
    conceptTagline: `${context.cardType || '教学卡片'} · AI 辅助图示`,
  };

  const structured: StructuredDiagramSpec = {
    header,
    stages,
    notes: [
      `用图示让学生“看到”${context.knowledgePoint} 的操作顺序。`,
      '结合班级实际调整细节。',
    ],
    highlight: '关注每个步骤中的学生表现，及时调整节奏。',
  };

  const visual: VisualizationSpec = {
    type: 'structured-diagram',
    theme: FALLBACK_THEME,
    layout: FALLBACK_LAYOUT,
    center: {
      title: header.title,
      subtitle: header.subtitle,
    },
    branches: [],
    footerNote: '此图示由 Inspi.AI 自动生成，请酌情修改。',
    structured,
  };

  applyStructuredDiagramImage(visual);

  return {
    summary: defaultSummary(context),
    visual,
  };
}

function deriveFallbackStageSources(context: VisualAssistContext) {
  const content = context.cardContent;
  if (!content) {
    return buildDefaultStageSources(context.knowledgePoint);
  }
  const lines = content
    .split(/\n+/)
    .map(line => line.replace(/^[>\-\*#\d\.、\)\s·•⋅]+/, '').trim())
    .filter(Boolean);

  const stages = [] as Array<{ title: string; summary: string; details?: string[] }>;
  const visited = new Set<string>();
  for (const line of lines) {
    const normalized = line.slice(0, 200);
    if (!normalized || visited.has(normalized)) {
      continue;
    }
    visited.add(normalized);
    const colonIndex = normalized.search(/[:：]/);
    let title = '';
    let summary = normalized;
    if (colonIndex > 0 && colonIndex < 24) {
      title = normalized.slice(0, colonIndex).trim();
      summary = normalized.slice(colonIndex + 1).trim() || summary;
    }
    stages.push({
      title: title || `步骤${stages.length + 1}`,
      summary,
      details: splitByDelimiters(summary),
    });
    if (stages.length >= 4) {
      break;
    }
  }

  return stages.length > 0 ? stages : buildDefaultStageSources(context.knowledgePoint);
}

function buildDefaultStageSources(knowledgePoint: string) {
  return [
    {
      title: '情境引入',
      summary: `用生活例子唤醒学生对“${knowledgePoint}”的关注。`,
      details: ['抛出问题或观察任务', '让学生说出已有经验'],
    },
    {
      title: '拆解步骤',
      summary: `把“${knowledgePoint}”分成可执行的 2-3 个动作。`,
      details: ['标注关键概念', '提示常见误区'],
    },
    {
      title: '实践练习',
      summary: '让学生操作/讨论，并要求给出证据。',
      details: ['分组任务或同伴互评'],
    },
    {
      title: '反馈与连接',
      summary: '收集学生产出，连接到真实场景。',
      details: ['总结收获', '预告延伸任务'],
    },
  ];
}

function splitByDelimiters(text: string) {
  return text
    .split(/[。；;、,，]/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function deriveStageFallbackSummary(context: VisualAssistContext, index: number) {
  const base = context.cardTitle || context.knowledgePoint;
  const steps = ['引入情境', '拆分动作', '引导练习', '展示成果', '迁移延伸'];
  return `围绕“${base}”的${steps[index] || '重点环节'}`;
}

function defaultSummary(context: VisualAssistContext) {
  return `围绕“${context.cardTitle || context.knowledgePoint}”设计的辅助图示，让课堂步骤更清晰。`;
}

function defaultSubtitle(context: VisualAssistContext) {
  return `${context.subject || '课堂'} · ${context.gradeLevel || '适用年级'}`;
}

async function sanitizeRequiredText(value: unknown, fallback: string) {
  const source = typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  return (await cleanUserContent(source)).trim();
}

async function sanitizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }
  const cleaned = (await cleanUserContent(value)).trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

async function sanitizeStringList(values: unknown, limit: number) {
  if (!Array.isArray(values)) {
    return [];
  }
  const sanitized = [] as string[];
  for (const item of values) {
    if (sanitized.length >= limit) {
      break;
    }
    const cleaned = await sanitizeOptionalText(item);
    if (cleaned) {
      sanitized.push(cleaned);
    }
  }
  return sanitized;
}

async function sanitizeEmoji(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 4) {
    return undefined;
  }
  return trimmed;
}

function normalizeTheme(theme: unknown): VisualizationSpec['theme'] {
  if (typeof theme !== 'string') {
    return FALLBACK_THEME;
  }
  const lowered = theme.toLowerCase();
  const themes: VisualizationSpec['theme'][] = ['ocean', 'sunrise', 'forest', 'galaxy', 'neutral'];
  return themes.includes(lowered as VisualizationSpec['theme'])
    ? (lowered as VisualizationSpec['theme'])
    : FALLBACK_THEME;
}

function normalizeLayout(layout: unknown): VisualizationSpec['layout'] {
  if (typeof layout !== 'string') {
    return FALLBACK_LAYOUT;
  }
  const lowered = layout.toLowerCase();
  if (['left-to-right', 'right-to-left', 'radial', 'grid', 'hierarchical'].includes(lowered)) {
    return lowered as VisualizationSpec['layout'];
  }
  if (['top-down', 'vertical'].includes(lowered)) {
    return 'hierarchical';
  }
  return FALLBACK_LAYOUT;
}

async function normalizeCardContent(rawContent: string | undefined) {
  if (typeof rawContent !== 'string') {
    return undefined;
  }
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return undefined;
  }
  const limited = trimmed.slice(0, MAX_CARD_CONTENT_LENGTH);
  const withoutHtml = limited.replace(/<[^>]+>/g, ' ');
  const withoutMarkdown = withoutHtml.replace(/[`*_#>\-]+/g, ' ');
  const collapsed = withoutMarkdown.replace(/\s+/g, ' ').trim();
  if (!collapsed) {
    return undefined;
  }
  const cleaned = await cleanUserContent(collapsed, false);
  return cleaned.slice(0, 500);
}

function extractJSON(content: string): string | null {
  if (typeof content !== 'string') {
    return null;
  }
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return content.slice(start, end + 1);
}


function applyStructuredDiagramImage(visual: VisualizationSpec) {
  const structured = visual.structured;
  if (!structured) {
    return;
  }
  const svg = buildStructuredDiagramSVG(structured);
  if (!svg) {
    return;
  }
  const base64 = Buffer.from(svg).toString('base64');
  visual.imageUrl = `data:image/svg+xml;base64,${base64}`;
  visual.imageMetadata = {
    provider: 'structured-svg',
    width: 900,
    height: 520,
    generatedAt: new Date().toISOString(),
  };
}

function buildStructuredDiagramSVG(structured: StructuredDiagramSpec): string {
  const width = 900;
  const height = 520;
  const padding = 36;
  const usableWidth = width - padding * 2;
  const stageCount = Math.max(1, Math.min(structured.stages.length, 5));
  const stageGap = stageCount > 1 ? usableWidth / (stageCount - 1) : 0;
  const headerTitle = escapeSvg(structured.header.title || '辅助图示');
  const headerSubtitle = escapeSvg(structured.header.subtitle || '');
  const highlight = escapeSvg(structured.highlight || '结合课堂实际调整节奏');

  const stageNodes = structured.stages.slice(0, stageCount).map((stage, index) => {
    const x = padding + stageGap * index;
    const y = height / 2 + 24;
    const title = escapeSvg(stage.title);
    const summary = escapeSvg(stage.summary || '');
    const details = (stage.details || [])
      .slice(0, 2)
      .map(detail => `<tspan x="${x}" dy="16">• ${escapeSvg(detail)} </tspan>`)
      .join('');

    return `
      <g transform="translate(${x}, ${y})">
        <circle cx="0" cy="0" r="40" fill="#e0f2fe" stroke="#0ea5e9" stroke-width="2" />
        <text x="0" y="-60" text-anchor="middle" font-size="16" font-weight="600" fill="#0f172a">${title}</text>
        <text x="0" y="-34" text-anchor="middle" font-size="12" fill="#475569">${summary}</text>
        <text x="0" y="-8" text-anchor="middle" font-size="11" fill="#475569">${details}</text>
      </g>
    `;
  }).join('');

  const connectors = stageCount > 1
    ? Array.from({ length: stageCount - 1 }).map((_, index) => {
        const x1 = padding + stageGap * index;
        const x2 = padding + stageGap * (index + 1);
        const y = height / 2 + 24;
        return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round" />`;
      }).join('')
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#e0f2fe" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="32" fill="url(#bg)" />
  <text x="${padding}" y="${padding + 8}" font-size="28" font-weight="700" fill="#0f172a">${headerTitle}</text>
  <text x="${padding}" y="${padding + 38}" font-size="14" fill="#475569">${headerSubtitle}</text>
  ${connectors}
  ${stageNodes}
  <text x="${padding}" y="${height - padding}" font-size="13" fill="#0ea5e9">${highlight}</text>
</svg>`;
}

function escapeSvg(value?: string): string {
  if (!value) {
    return '';
  }
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

