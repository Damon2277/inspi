import { aiProviderOrder, getAIService } from '@/core/ai/aiProvider';
import { imageService } from '@/core/ai/imageService';
import { generatePrompt, PromptContext, validateCardContent } from '@/core/ai/promptTemplates';
import { planVisualizationPrompt } from '@/core/ai/visualPromptPlanner';
import { cleanUserContent } from '@/lib/security';
import type {
  CardPresentationCue,
  CardPresentationMeta,
  CardSOPMicroStep,
  CardSOPSection,
  TeachingCard,
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

const visualizationPlaceholderThemes: Record<VisualizationTheme, {
  gradientStart: string;
  gradientEnd: string;
  accent: string;
}> = {
  ocean: { gradientStart: '#0ea5e9', gradientEnd: '#2563eb', accent: '#e0f2fe' },
  sunrise: { gradientStart: '#fb923c', gradientEnd: '#f59e0b', accent: '#fff7ed' },
  forest: { gradientStart: '#22c55e', gradientEnd: '#15803d', accent: '#ecfccb' },
  galaxy: { gradientStart: '#6366f1', gradientEnd: '#8b5cf6', accent: '#ede9fe' },
  neutral: { gradientStart: '#0f172a', gradientEnd: '#475569', accent: '#f8fafc' },
};

function escapeSvgText(value?: string): string {
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

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function encodeSvg(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')}`;
}

function createVisualizationPlaceholder(
  knowledgePoint: string,
  theme: VisualizationTheme,
): string {
  const palette = visualizationPlaceholderThemes[theme] ?? visualizationPlaceholderThemes.neutral;
  const title = escapeSvgText(truncateText(knowledgePoint || '概念可视化', 18));
  const subtitle = escapeSvgText('AI 概念可视化卡');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="720" height="460" viewBox="0 0 720 460" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.gradientStart}"/>
      <stop offset="100%" stop-color="${palette.gradientEnd}"/>
    </linearGradient>
  </defs>
  <rect width="720" height="460" rx="32" fill="url(#gradient)"/>
  <g fill="${palette.accent}" opacity="0.15">
    <circle cx="120" cy="80" r="60"/>
    <circle cx="580" cy="120" r="40"/>
    <circle cx="620" cy="360" r="80"/>
    <circle cx="160" cy="360" r="50"/>
  </g>
  <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-family="'PingFang SC', 'Inter', sans-serif" font-size="38" fill="#f8fafc" font-weight="700">${title}</text>
  <text x="50%" y="64%" text-anchor="middle" font-family="'PingFang SC', 'Inter', sans-serif" font-size="18" fill="${palette.accent}" opacity="0.95">${subtitle}</text>
</svg>`;

  return encodeSvg(svg);
}

function ensureVisualizationPlaceholder(
  card: TeachingCard,
  knowledgePoint: string,
): TeachingCard {
  if (card.type !== 'visualization' || !card.visual?.theme || card.visual.imageUrl) {
    return card;
  }

  const metaKnowledgePoint = typeof card.metadata?.knowledgePoint === 'string'
    ? card.metadata?.knowledgePoint
    : knowledgePoint;
  const imageUrl = createVisualizationPlaceholder(metaKnowledgePoint || knowledgePoint, card.visual.theme ?? 'neutral');

  return {
    ...card,
    visual: {
      ...card.visual,
      imageUrl,
      imageMetadata: {
        provider: 'placeholder',
        width: 720,
        height: 460,
        generatedAt: new Date().toISOString(),
      },
    },
  };
}

function getHeroFallbackConfig(knowledgePoint: string) {
  const warmKeywords = ['太阳', 'sun', '恒星', '火', '火焰', '火山', '熔岩', '热能'];
  const lower = knowledgePoint.toLowerCase();
  const isWarmConcept = warmKeywords.some((keyword) =>
    keyword === keyword.toLowerCase()
      ? lower.includes(keyword)
      : knowledgePoint.includes(keyword),
  );

  const theme: VisualizationTheme = isWarmConcept ? 'sunrise' : 'neutral';

  const palette = isWarmConcept
    ? ['#F97316', '#DC2626', '#FBBF24']
    : ['#0EA5E9', '#1E3A8A', '#FACC15'];

  const imagePrompt = isWarmConcept
    ? `${knowledgePoint} 概念插画，炽热金橙色光焰，星体细节清晰，科普海报风`
    : `${knowledgePoint} 概念插画，电影感光影，蓝绿色主色调，清晰的能量流动，科普海报风`;

  return {
    summary: `以视觉隐喻呈现“${knowledgePoint}”的核心形象与能量流向。`,
    centerSubtitle: '把抽象概念化成一幅可以“看懂”的画面',
    imagePrompt,
    footerNote: '提示：可让学生描述插画中的元素与知识点的对应关系',
    theme,
    composition: {
      metaphor: `${knowledgePoint} 被拟作可视化的自然或课堂场景`,
      visualFocus: '画面中央突出概念核心，周围用流线或光束表现流动',
      backgroundMood: isWarmConcept
        ? '炽热金橙色光晕，营造能量爆发的课堂氛围'
        : '柔和的蓝绿渐层，营造理性与启发的课堂氛围',
      colorPalette: palette,
    } as {
      metaphor: string;
      visualFocus: string;
      backgroundMood: string;
      colorPalette: string[];
    },
  };
}

export async function generateTeachingCard(options: GenerateCardOptions): Promise<TeachingCard> {
  const { cardType, knowledgePoint, subject, gradeLevel, isMockMode, promptContext, sessionId } = options;

  if (isMockMode) {
    const fallbackCard = enrichCard(
      generateFallbackCard(cardType, knowledgePoint),
      knowledgePoint,
      subject,
      gradeLevel,
    );
    return attachVisualizationImage(fallbackCard, knowledgePoint);
  }

  try {
    const prompt = generatePrompt(cardType, promptContext);
    const cacheVersion = 'v2';
    const cacheKey = `card_${cacheVersion}_${cardType}_${knowledgePoint}_${subject || 'general'}`;
    const providersToTry = aiProviderOrder;
    let lastError: unknown = null;

    for (const provider of providersToTry) {
      try {
        const service = getAIService(provider);
        const result = await service.generateContent(prompt, {
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

        return attachVisualizationImage(processed, knowledgePoint);
      } catch (providerError) {
        lastError = providerError;
        logger.warn('AI provider调用失败，尝试下一个候选', {
          provider,
          cardType,
          knowledgePoint,
          error: providerError instanceof Error ? providerError.message : 'Unknown error',
        });
      }
    }

    throw lastError instanceof Error ? lastError : new Error('All AI providers failed');
  } catch (error) {
    logger.warn('generateTeachingCard failed, fallback used', {
      cardType,
      knowledgePoint,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const fallbackCard = enrichCard(
      generateFallbackCard(cardType, knowledgePoint),
      knowledgePoint,
      subject,
      gradeLevel,
    );

    return attachVisualizationImage(fallbackCard, knowledgePoint);
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
    const parsedVisualization = await parseVisualizationJSON(rawContent, knowledgePoint, subject, gradeLevel);
    const heroVisualization = parsedVisualization.visual?.type === 'hero-illustration'
      ? parsedVisualization
      : await buildVisualizationFallback(knowledgePoint, subject, gradeLevel);
    const { summary, visual } = heroVisualization;

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

async function attachVisualizationImage(
  card: TeachingCard,
  knowledgePoint: string,
): Promise<TeachingCard> {
  if (card.type !== 'visualization' || !card.visual) {
    return card;
  }

  if (!imageService.isEnabled()) {
    return ensureVisualizationPlaceholder(card, knowledgePoint);
  }

  try {
    let updatedVisual = card.visual;
    const subjectMeta = typeof card.metadata?.subject === 'string' ? card.metadata?.subject : undefined;
    const gradeMeta = typeof card.metadata?.gradeLevel === 'string' ? card.metadata?.gradeLevel : undefined;

    if (card.visual.imagePrompt) {
      let positivePrompt = card.visual.imagePrompt.trim();
      let negativePrompt = card.visual.negativePrompt?.trim();

      if (!positivePrompt) {
        positivePrompt = `${knowledgePoint} 概念教学插画`;
      }

      if (!negativePrompt) {
        const plannedPrompt = await planVisualizationPrompt({
          knowledgePoint,
          subject: subjectMeta,
          gradeLevel: gradeMeta,
          basePrompt: positivePrompt,
          visualSpec: card.visual,
        });

        if (plannedPrompt?.positivePrompt) {
          positivePrompt = plannedPrompt.positivePrompt;
        }
        if (plannedPrompt?.negativePrompt) {
          negativePrompt = plannedPrompt.negativePrompt;
        }

        if (plannedPrompt) {
          updatedVisual = {
            ...updatedVisual,
            imagePrompt: plannedPrompt.positivePrompt ?? positivePrompt,
            negativePrompt: plannedPrompt.negativePrompt ?? negativePrompt,
          };
        }
      }

      const sanitizedPositive = positivePrompt.trim() || `${knowledgePoint} 概念教学插画`;
      const sanitizedNegative = negativePrompt?.trim();

      const result = await imageService.generateHeroIllustration(sanitizedPositive, {
        cacheKey: `visual-card:${knowledgePoint}:${sanitizedPositive}:${sanitizedNegative || 'none'}`,
        negativePrompt: sanitizedNegative,
      });

      if (result?.imageUrl) {
        updatedVisual = {
          ...updatedVisual,
          imageUrl: result.imageUrl,
          imageMetadata: {
            provider: result.provider,
            width: result.width,
            height: result.height,
            generatedAt: new Date().toISOString(),
          },
        };
      }
    }

    if (updatedVisual.type === 'structured-diagram' && updatedVisual.structured) {
      const stagesWithImages = await Promise.all(
        updatedVisual.structured.stages.map(async (stage) => {
          if (!stage?.imagePrompt || stage.imageUrl) {
            return stage;
          }

          const trimmedPrompt = stage.imagePrompt.trim();
          if (!trimmedPrompt) {
            return stage;
          }

          try {
          const stageResult = await imageService.generateHeroIllustration(trimmedPrompt, {
            cacheKey: `visual-stage:${knowledgePoint}:${stage.id}:${trimmedPrompt}`,
            size: imageService.getStageImageSize(),
          });

            if (!stageResult?.imageUrl) {
              return stage;
            }

            return {
              ...stage,
              imageUrl: stageResult.imageUrl,
              imageMetadata: {
                provider: stageResult.provider,
                width: stageResult.width,
                height: stageResult.height,
                generatedAt: new Date().toISOString(),
              },
            };
          } catch (error) {
            logger.debug('Failed to generate stage illustration', {
              knowledgePoint,
              stageId: stage.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            return stage;
          }
        }),
      );

      updatedVisual = {
        ...updatedVisual,
        structured: {
          ...updatedVisual.structured,
          stages: stagesWithImages,
        },
      };
    }

    return ensureVisualizationPlaceholder({
      ...card,
      visual: updatedVisual,
    }, knowledgePoint);
  } catch (error) {
    logger.warn('attachVisualizationImage failed', {
      knowledgePoint,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return ensureVisualizationPlaceholder(card, knowledgePoint);
  }
}

async function parseVisualizationJSON(
  rawContent: string,
  knowledgePoint: string,
  subject?: string,
  gradeLevel?: string,
): Promise<{ summary: string; visual: VisualizationSpec }> {
  const jsonPayload = extractJSON(rawContent);

  if (!jsonPayload) {
    logger.warn('Visualization payload missing JSON, using fallback');
    return buildVisualizationFallback(knowledgePoint, subject, gradeLevel);
  }

  try {
    const parsed = JSON.parse(jsonPayload);
    const heroFallback = getHeroFallbackConfig(knowledgePoint);

    const summary = await sanitizeRequiredText(
      parsed.summary,
      `用一幅图掌握“${knowledgePoint}”的要点。`,
    );

    const rawVisual = parsed.visual ?? {};
    const theme = normalizeTheme(rawVisual.theme);
    const layout =
      typeof rawVisual.layout === 'string' && rawVisual.layout.trim().length > 0
        ? rawVisual.layout.trim()
        : 'centered';

    const centerTitle = await sanitizeRequiredText(rawVisual.center?.title, knowledgePoint);
    const centerSubtitle =
      (await sanitizeOptionalText(rawVisual.center?.subtitle)) ?? heroFallback.centerSubtitle;

    const stagesInput = Array.isArray(rawVisual.stages)
      ? rawVisual.stages
      : Array.isArray(rawVisual?.structured?.stages)
      ? rawVisual.structured.stages
      : [];

    const stages = await Promise.all(
      stagesInput.slice(0, 4).map(async (stage: any, index: number) => {
        if (!stage || typeof stage !== 'object') {
          return null;
        }

        const title = await sanitizeRequiredText(stage.title, `要点${index + 1}`);
        const summaryText = (await sanitizeOptionalText(stage.summary)) ?? '';
        const icon =
          typeof stage.icon === 'string' && stage.icon.trim().length <= 4
            ? stage.icon.trim()
            : undefined;
        const imagePrompt = await sanitizeOptionalText(stage.imagePrompt);
        const imageUrl =
          typeof stage.imageUrl === 'string' && stage.imageUrl.trim().length > 0
            ? stage.imageUrl.trim()
            : undefined;
        const imageMetadata = sanitizeImageMetadata(stage.imageMetadata);

        return {
          title,
          summary: summaryText,
          icon,
          imagePrompt,
          imageUrl,
          imageMetadata,
        } as ParsedStage;
      }),
    ).then((items) => items.filter(Boolean) as ParsedStage[]);

    const annotationCandidates = Array.isArray(rawVisual.annotations)
      ? rawVisual.annotations.slice(0, 4)
      : [];

    const annotationsFromPayload = await Promise.all(
      annotationCandidates.map(async (annotation: any, index: number) => {
        if (!annotation || typeof annotation !== 'object') {
          return null;
        }

        const hasContent =
          (typeof annotation.title === 'string' && annotation.title.trim().length > 0)
          || (typeof annotation.description === 'string' && annotation.description.trim().length > 0);

        if (!hasContent) {
          return null;
        }

        const title = await sanitizeRequiredText(annotation.title, `要点${index + 1}`);
        const description = (await sanitizeOptionalText(annotation.description)) ?? '';
        const icon =
          typeof annotation.icon === 'string' && annotation.icon.trim().length <= 4
            ? annotation.icon.trim()
            : undefined;
        const placement = normalizeAnnotationPlacement(annotation.placement);

        return {
          title,
          description,
          icon,
          placement,
        };
      }),
    ).then((items) => items.filter(Boolean));

    let annotations: VisualizationSpec['annotations'] =
      annotationsFromPayload.length > 0
        ? (annotationsFromPayload as VisualizationSpec['annotations'])
        : undefined;

    if (!annotations && stages.length > 0) {
      const placementOrder: Array<'left' | 'right' | 'bottom' | 'top'> = ['left', 'right', 'bottom', 'top'];
      annotations = stages.slice(0, 3).map((stage, index) => ({
        title: stage.title,
        description: stage.summary,
        icon: stage.icon,
        placement: placementOrder[index % placementOrder.length],
      }));
    }

    const footerNote =
      (await sanitizeOptionalText(rawVisual.footerNote)) ?? heroFallback.footerNote;

    const composition =
      (await buildHeroComposition(rawVisual.composition))
      ?? (await buildHeroComposition(heroFallback.composition));

    const promptCandidates = [
      rawVisual.imagePrompt,
      rawVisual.heroPrompt,
      parsed.imagePrompt,
      parsed.prompt,
      ...stages.map((stage) => stage.imagePrompt),
      heroFallback.imagePrompt,
    ];

    let imagePrompt: string | undefined;
    for (const candidate of promptCandidates) {
      const cleaned = await sanitizeOptionalText(candidate);
      if (cleaned) {
        imagePrompt = cleaned;
        break;
      }
    }

    const stageWithImage = stages.find((stage) => stage.imageUrl);
    const imageUrl =
      typeof rawVisual.imageUrl === 'string' && rawVisual.imageUrl.trim().length > 0
        ? rawVisual.imageUrl.trim()
        : stageWithImage?.imageUrl;

    const imageMetadata =
      sanitizeImageMetadata(rawVisual.imageMetadata) ?? stageWithImage?.imageMetadata;

    if (!imagePrompt) {
      imagePrompt = await sanitizeRequiredText(heroFallback.imagePrompt, heroFallback.imagePrompt);
    }

    const enhancedPrompt = enhanceImagePrompt(imagePrompt, {
      knowledgePoint,
      subject,
      summary,
      stageHighlights: collectStageHighlights(stages),
    });

    const planned = await planVisualizationPrompt({
      knowledgePoint,
      subject,
      gradeLevel,
      basePrompt: enhancedPrompt,
      visualSpec: rawVisual,
    });

    const finalPrompt = planned?.positivePrompt ?? enhancedPrompt;
    const negativePrompt = planned?.negativePrompt;

    const visualSpec: VisualizationSpec = {
      type: 'hero-illustration',
      theme,
      layout,
      imagePrompt: finalPrompt,
      negativePrompt,
      imageUrl,
      imageMetadata,
      center: {
        title: centerTitle,
        subtitle: centerSubtitle,
      },
      branches: [],
      footerNote,
      composition,
      annotations,
    };

    return {
      summary,
      visual: visualSpec,
    };
  } catch (error) {
    logger.warn('Failed to parse visualization JSON', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return buildVisualizationFallback(knowledgePoint, subject, gradeLevel);
  }
}

interface ParsedStage {
  title: string;
  summary: string;
  icon?: string;
  imagePrompt?: string;
  imageUrl?: string;
  imageMetadata?: VisualizationSpec['imageMetadata'];
}

async function sanitizeRequiredText(value: unknown, fallback: string): Promise<string> {
  const source =
    typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  return (await cleanUserContent(source)).trim();
}

async function sanitizeOptionalText(value: unknown): Promise<string | undefined> {
  if (typeof value !== 'string') {
    return undefined;
  }
  const cleaned = (await cleanUserContent(value)).trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function sanitizeImageMetadata(input: unknown): VisualizationSpec['imageMetadata'] | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }
  const metadata = input as Record<string, unknown>;
  const provider = typeof metadata.provider === 'string' ? metadata.provider : undefined;
  const width = typeof metadata.width === 'number' ? metadata.width : undefined;
  const height = typeof metadata.height === 'number' ? metadata.height : undefined;
  const generatedAt = typeof metadata.generatedAt === 'string' ? metadata.generatedAt : undefined;

  if (!provider && !width && !height && !generatedAt) {
    return undefined;
  }

  return { provider, width, height, generatedAt };
}

function normalizeAnnotationPlacement(value: unknown): 'left' | 'right' | 'top' | 'bottom' | 'center' | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const lowered = value.trim().toLowerCase();
  if (lowered === 'left' || lowered === 'right' || lowered === 'top' || lowered === 'bottom' || lowered === 'center') {
    return lowered as 'left' | 'right' | 'top' | 'bottom' | 'center';
  }
  return undefined;
}

async function buildHeroComposition(input: unknown): Promise<VisualizationSpec['composition'] | undefined> {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const composition = input as Record<string, unknown>;

  const metaphor = await sanitizeOptionalText(composition.metaphor);
  const visualFocus = await sanitizeOptionalText(composition.visualFocus);
  const backgroundMood = await sanitizeOptionalText(composition.backgroundMood);
  const colorPalette = Array.isArray(composition.colorPalette)
    ? composition.colorPalette
        .map((color: unknown) => (typeof color === 'string' ? color.trim() : ''))
        .filter((color) => color.length > 0)
        .slice(0, 4)
    : undefined;

  if (!metaphor && !visualFocus && !backgroundMood && (!colorPalette || colorPalette.length === 0)) {
    return undefined;
  }

  return {
    metaphor: metaphor ?? undefined,
    visualFocus: visualFocus ?? undefined,
    backgroundMood: backgroundMood ?? undefined,
    colorPalette: colorPalette && colorPalette.length > 0 ? colorPalette : undefined,
  };
}

interface PromptEnhancementContext {
  knowledgePoint: string;
  subject?: string;
  summary?: string;
  stageHighlights?: string[];
}

const SUBJECT_STYLE_HINT_RULES: Array<{ keys: string[]; hint: string }> = [
  { keys: ['生物', 'biology', '生命'], hint: '科普插画，突出生物结构与能量循环' },
  { keys: ['化学', 'chemistry'], hint: '科普插画，展示化学反应与分子结构' },
  { keys: ['物理', 'physics'], hint: '科普插画，强调能量传递与运动轨迹' },
  { keys: ['地理', 'geography'], hint: '地理教学插画，呈现自然环境层次' },
  { keys: ['历史', 'history'], hint: '历史教学插画，带时间线与文明元素' },
  { keys: ['数学', 'math', 'mathematics'], hint: '数学概念插画，突出结构与逻辑关系' },
  { keys: ['天文', 'astronomy', '宇宙'], hint: '宇宙科普插画，凸显星体结构与能量' },
];

const DEFAULT_SUBJECT_HINT = '教学插画，清晰呈现知识重点';

function enhanceImagePrompt(basePrompt: string, context: PromptEnhancementContext): string {
  const trimmedBase = basePrompt.trim();
  if (!trimmedBase) {
    return `${context.knowledgePoint} 概念插画`;
  }

  const additions: string[] = [];
  const stageHighlights = (context.stageHighlights ?? [])
    .map((value) => normalizeHighlight(value))
    .filter((value) => value.length > 0);

  if (stageHighlights.length > 0) {
    additions.push(`表现${stageHighlights.slice(0, 3).join('、')}`);
  }

  const summarySnippet = context.summary ? extractPromptSnippet(context.summary, 16) : undefined;
  if (summarySnippet && !additions.some((item) => item.includes(summarySnippet))) {
    additions.push(summarySnippet);
  }

  const subjectHint = resolveSubjectHint(context.subject);
  if (subjectHint && !additions.includes(subjectHint)) {
    additions.push(subjectHint);
  }

  const uniqueAdditions: string[] = [];
  additions.forEach((item) => {
    const normalized = item.replace(/[，。]+$/g, '').trim();
    if (!normalized) {
      return;
    }
    if (trimmedBase.includes(normalized)) {
      return;
    }
    if (uniqueAdditions.some((existing) => existing.includes(normalized))) {
      return;
    }
    uniqueAdditions.push(normalized);
  });

  if (uniqueAdditions.length === 0) {
    return trimPromptLength(trimmedBase);
  }

  const enhanced = `${trimmedBase.replace(/[，。]+$/g, '')}，${uniqueAdditions.join('，')}`;
  return trimPromptLength(enhanced);
}

function collectStageHighlights(stages: ParsedStage[], limit = 3): string[] {
  const highlights: string[] = [];
  for (const stage of stages) {
    if (stage.title) {
      const title = normalizeHighlight(stage.title);
      if (title && !highlights.includes(title)) {
        highlights.push(title);
      }
    }

    if (stage.summary) {
      const snippet = extractPromptSnippet(stage.summary, 8);
      if (snippet && !highlights.includes(snippet)) {
        highlights.push(snippet);
      }
    }

    if (highlights.length >= limit) {
      break;
    }
  }

  return highlights.slice(0, limit);
}

function resolveSubjectHint(subject?: string): string | undefined {
  if (!subject) {
    return undefined;
  }
  const normalized = subject.trim().toLowerCase();
  for (const rule of SUBJECT_STYLE_HINT_RULES) {
    if (rule.keys.some((key) => normalized.includes(key.toLowerCase()))) {
      return rule.hint;
    }
  }
  return DEFAULT_SUBJECT_HINT;
}

function normalizeHighlight(text: string): string {
  return text
    .replace(/[\s\u3000]+/g, '')
    .replace(/阶段|要点|部分|步骤|模块|环节|一图|示意/g, '')
    .replace(/[，。,.;；:：]/g, '')
    .slice(0, 8)
    .trim();
}

function extractPromptSnippet(text: string, maxLength: number): string | undefined {
  const cleaned = text
    .replace(/\s+/g, '')
    .replace(/[\r\n]/g, '')
    .replace(/^[，。、]/g, '')
    .replace(/[‘’“”]/g, '')
    .trim();
  if (!cleaned) {
    return undefined;
  }
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

function trimPromptLength(prompt: string, maxLength = 110): string {
  if (prompt.length <= maxLength) {
    return prompt;
  }
  return `${prompt.slice(0, maxLength - 1)}…`;
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

async function buildVisualizationFallback(
  knowledgePoint: string,
  subject?: string,
  gradeLevel?: string,
): Promise<{
  summary: string;
  visual: VisualizationSpec;
}> {
  const config = getHeroFallbackConfig(knowledgePoint);

  const summary = await sanitizeRequiredText(config.summary, config.summary);
  const centerSubtitle = await sanitizeRequiredText(config.centerSubtitle, config.centerSubtitle);
  const imagePrompt = await sanitizeRequiredText(config.imagePrompt, config.imagePrompt);
  const footerNote = await sanitizeRequiredText(config.footerNote, config.footerNote);
  const composition = await buildHeroComposition(config.composition);
  const enhancedPrompt = enhanceImagePrompt(imagePrompt, {
    knowledgePoint,
    subject,
    summary,
    stageHighlights: [],
  });
  const planned = await planVisualizationPrompt({
    knowledgePoint,
    subject,
    gradeLevel,
    basePrompt: enhancedPrompt,
  });
  const fallbackPrompt = planned?.positivePrompt ?? enhancedPrompt;
  const negativePrompt = planned?.negativePrompt;
  const theme = config.theme ?? 'neutral';
  const placeholderImageUrl = createVisualizationPlaceholder(knowledgePoint, theme);

  const annotations = await Promise.all(
    [
      {
        title: '核心要素',
        description: '引导学生观察插画中央代表概念本身的元素。',
        icon: '🌟',
        placement: 'left' as const,
      },
      {
        title: '能量流向',
        description: '指出光束/箭头如何表现概念的转化或流动。',
        icon: '🔄',
        placement: 'right' as const,
      },
    ].map(async (item) => ({
      title: await sanitizeRequiredText(item.title, item.title),
      description: await sanitizeRequiredText(item.description, item.description),
      icon: item.icon,
      placement: item.placement,
    })),
  );

  const visualSpec: VisualizationSpec = {
    type: 'hero-illustration',
    theme,
    layout: 'centered',
    imagePrompt: fallbackPrompt,
    negativePrompt,
    imageUrl: placeholderImageUrl,
    imageMetadata: {
      provider: 'placeholder',
      width: 720,
      height: 460,
      generatedAt: new Date().toISOString(),
    },
    center: {
      title: knowledgePoint,
      subtitle: centerSubtitle,
    },
    branches: [],
    footerNote,
    composition,
    annotations,
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
    studentActions: '快速回答教学互动中抛出的检核问题。',
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
  const conceptConfig = getHeroFallbackConfig(knowledgePoint);
  const fallbackImagePrompt = enhanceImagePrompt(conceptConfig.imagePrompt, {
    knowledgePoint,
    stageHighlights: [],
  });

  const planned = {
    positivePrompt: fallbackImagePrompt,
    negativePrompt: undefined,
  };

  const fallbackMap: Record<RawCardType, TeachingCard> = {
    concept: {
      id: `fallback_concept_${Date.now()}`,
      type: 'visualization',
      title: '概念可视化',
      content: conceptConfig.summary,
      explanation: `概念解释卡片 - ${knowledgePoint}`,
      visual: {
        type: 'hero-illustration',
        theme: conceptConfig.theme ?? 'neutral',
        layout: 'centered',
        imagePrompt: planned.positivePrompt,
        negativePrompt: planned.negativePrompt,
        center: {
          title: knowledgePoint,
          subtitle: conceptConfig.centerSubtitle,
        },
        branches: [],
        footerNote: conceptConfig.footerNote,
        composition: conceptConfig.composition,
        annotations: [
          {
            title: '核心要素',
            description: '引导学生观察插画中央代表概念本身的元素。',
            icon: '🌟',
            placement: 'left',
          },
          {
            title: '能量流向',
            description: '指出光束/箭头如何表现概念的转化或流动。',
            icon: '🔄',
            placement: 'right',
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
