import { deepSeekService } from '@/core/ai/deepseekService';
import type { VisualizationSpec } from '@/shared/types/teaching';
import { logger } from '@/shared/utils/logger';

interface VisualPromptPlannerInput {
  knowledgePoint: string;
  subject?: string;
  gradeLevel?: string;
  basePrompt?: string;
  visualSpec?: VisualizationSpec;
}

interface VisualPromptPlan {
  positivePrompt: string;
  positiveSegments: string[];
  negativePrompt?: string;
  negativeSegments: string[];
}

interface PlannerJSON {
  concept?: {
    core?: string;
    relations?: string[];
    process?: string[];
    misconceptions?: string[];
  };
  visualMapping?: {
    visualType?: string;
    metaphor?: string;
    scene?: string;
    keyElements?: string[];
    annotations?: string[];
    colorLogic?: string[];
  };
  teachingFocus?: {
    labels?: string[];
    contrast?: string[];
    steps?: string[];
  };
  renderConstraints?: {
    composition?: string;
    style?: string;
    clarity?: string;
    aspect?: string;
    whitespace?: string;
  };
  prompts?: {
    positive?: string[];
    negative?: string[];
  };
}

export async function planVisualizationPrompt(
  input: VisualPromptPlannerInput,
): Promise<VisualPromptPlan | null> {
  const plannerPrompt = buildPlannerPrompt(input);

  try {
    const cacheKey = `visual-plan:${input.knowledgePoint}:${input.subject ?? 'general'}:${hashString(input.basePrompt ?? '')}`;
    const response = await deepSeekService.generateContent(plannerPrompt, {
      temperature: 0.2,
      maxTokens: 900,
      useCache: true,
      cacheKey,
      cacheTTL: 3600,
    });

    const payload = extractJSON(response.content);
    if (!payload) {
      throw new Error('Planner response missing JSON');
    }

    const data = JSON.parse(payload) as PlannerJSON;
    const rawPositiveSegments = dedupeSegments([
      input.basePrompt,
      ...normalizeArray(data.prompts?.positive),
      data.visualMapping?.scene,
      data.visualMapping?.metaphor,
      ...(data.visualMapping?.keyElements ?? []),
      data.renderConstraints?.composition,
      data.renderConstraints?.style,
      data.renderConstraints?.clarity,
      data.renderConstraints?.aspect,
    ]);

    const positiveSegments = compressPromptSegments(rawPositiveSegments, 6);

    const positivePrompt = positiveSegments.length > 0
      ? trimPromptLength(positiveSegments.join('，'))
      : `${input.knowledgePoint} 概念教学插画`;

    const negativeSegments = compressPromptSegments(dedupeSegments(normalizeArray(data.prompts?.negative)), 4);
    const negativePrompt = negativeSegments.length > 0
      ? trimPromptLength(negativeSegments.join('、'))
      : undefined;

    return {
      positivePrompt,
      positiveSegments,
      negativePrompt,
      negativeSegments,
    };
  } catch (error) {
    logger.warn('Visual prompt planning failed', {
      knowledgePoint: input.knowledgePoint,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

function buildPlannerPrompt(input: VisualPromptPlannerInput): string {
  const subject = input.subject ?? '未指定';
  const grade = input.gradeLevel ?? '未指定';
  const basePrompt = input.basePrompt ?? '无现成提示词';
  const specSummary = summarizeVisualSpec(input.visualSpec);

  return `你是一名「AI 教学可视化策划师」。请把知识点拆解为可被看见的元素，并将其转换为高质量图像提示词。

知识点: ${input.knowledgePoint}
学科: ${subject}
年级: ${grade}
现有提示词: ${basePrompt}
视觉线索: ${specSummary}

请按照以下步骤在心中推理，但只输出 JSON：
1. 概念拆解: core(一句话)、relations(2-3 条)、process(按顺序)、misconceptions(常见误区)
2. 可视化映射: visualType、metaphor 或 scene、keyElements、annotations、colorLogic
3. 教学强调: labels、contrast、steps（描述标注层次、对比、步骤序列）
4. 生成约束: composition、style、clarity、aspect、whitespace
5. 输出控制: prompts.positive 至少 4 条中文短语，prompts.negative 至少 2 条（说明要避免的元素或风格）

JSON 模板：
{
  "concept": {
    "core": "...",
    "relations": ["..."],
    "process": ["..."],
    "misconceptions": ["..."]
  },
  "visualMapping": {
    "visualType": "流程 / 对比 / 场景 / 隐喻等",
    "metaphor": "...",
    "scene": "...",
    "keyElements": ["..."],
    "annotations": ["..."],
    "colorLogic": ["..."]
  },
  "teachingFocus": {
    "labels": ["..."],
    "contrast": ["..."],
    "steps": ["..."]
  },
  "renderConstraints": {
    "composition": "...",
    "style": "...",
    "clarity": "...",
    "aspect": "...",
    "whitespace": "..."
  },
  "prompts": {
    "positive": ["..."],
    "negative": ["..."]
  }
}

仅输出 JSON，不要额外文字。`;
}

function summarizeVisualSpec(spec?: VisualizationSpec): string {
  if (!spec) {
    return '无参考';
  }
  const parts: string[] = [];
  parts.push(`类型=${spec.type}`);
  if (spec.center?.title) {
    parts.push(`中心=${spec.center.title}`);
  }
  if (spec.composition?.metaphor) {
    parts.push(`隐喻=${spec.composition.metaphor}`);
  }
  if (spec.composition?.visualFocus) {
    parts.push(`焦点=${spec.composition.visualFocus}`);
  }
  if (spec.annotations && spec.annotations.length > 0) {
    parts.push(`标注=${spec.annotations.map((a) => a.title).join('/')}`);
  }
  if (spec.composition?.colorPalette && spec.composition.colorPalette.length > 0) {
    parts.push(`色板=${spec.composition.colorPalette.join(',')}`);
  }
  return parts.join('；').slice(0, 180) || '无参考';
}

function normalizeArray(values?: string[]): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
    .slice(0, 8);
}

function dedupeSegments(segments: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  segments.forEach((segment) => {
    if (!segment) {
      return;
    }
    const original = segment.trim();
    if (!original) {
      return;
    }
    const normalized = normalizePromptForSimilarity(original);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    result.push(original);
  });
  return result;
}

function compressPromptSegments(segments: string[], maxSegments = 6): string[] {
  const result: { original: string; normalized: string }[] = [];

  segments.forEach((segment) => {
    const normalized = normalizePromptForSimilarity(segment);
    if (!normalized) {
      return;
    }

    const similarIndex = result.findIndex((existing) => isSegmentSimilar(existing.normalized, normalized));

    if (similarIndex !== -1) {
      if (normalized.length > result[similarIndex].normalized.length) {
        result[similarIndex] = { original: segment, normalized };
      }
      return;
    }

    if (result.length < maxSegments) {
      result.push({ original: segment, normalized });
    }
  });

  return result.map((item) => item.original);
}

function isSegmentSimilar(a: string, b: string): boolean {
  if (!a || !b) {
    return false;
  }
  if (a.includes(b) || b.includes(a)) {
    return true;
  }
  const minLen = Math.min(a.length, b.length);
  if (minLen < 6) {
    return false;
  }

  const shorter = a.length <= b.length ? a : b;
  const longer = shorter === a ? b : a;
  const uniqueChars = new Set(shorter.split(''));
  let overlap = 0;
  uniqueChars.forEach((char) => {
    if (longer.includes(char)) {
      overlap += 1;
    }
  });

  return overlap / uniqueChars.size >= 0.7;
}

function normalizePromptForSimilarity(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[，。、,.；;:：\-]/g, '')
    .replace(/\.{2,}/g, '.')
    .trim();
}

function trimPromptLength(prompt: string, maxLength = 160): string {
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

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
