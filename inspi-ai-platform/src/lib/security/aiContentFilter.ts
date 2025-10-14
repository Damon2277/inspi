/**
 * AI内容过滤服务
 * 使用AI模型进行智能内容审核
 */

import { geminiService } from '@/core/ai/geminiService';
import { logger } from '@/shared/utils/logger';

import { ValidationIssue } from './types';

// AI内容分析维度
export enum ContentAnalysisDimension {
  TOXICITY = 'toxicity',           // 毒性/恶意内容
  HARASSMENT = 'harassment',       // 骚扰/霸凌
  VIOLENCE = 'violence',           // 暴力内容
  HATE_SPEECH = 'hate_speech',     // 仇恨言论
  SEXUAL_CONTENT = 'sexual_content', // 性内容
  SPAM = 'spam',                   // 垃圾信息
  MISINFORMATION = 'misinformation', // 虚假信息
  PROFANITY = 'profanity',         // 脏话粗俗
  POLITICAL = 'political',         // 政治敏感
  ILLEGAL = 'illegal'              // 违法内容
}

export interface AIFilterResult {
  isAppropriate: boolean;
  confidence: number;
  categories: string[];
  reasoning: string;
  suggestedAction: 'allow' | 'review' | 'block';
  dimensionScores: Record<ContentAnalysisDimension, number>; // 各维度得分
  riskLevel: 'low' | 'medium' | 'high';
}

export class AIContentFilter {
  private enabled: boolean;
  private confidenceThreshold: number;

  constructor(options: { enabled?: boolean; confidenceThreshold?: number } = {}) {
    this.enabled = options.enabled ?? true;
    this.confidenceThreshold = options.confidenceThreshold ?? 0.8;
  }

  /**
   * 使用AI检测内容是否合适
   */
  async detect(content: string): Promise<ValidationIssue[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      const result = await this.analyzeContent(content);
      const issues: ValidationIssue[] = [];

      if (!result.isAppropriate) {
        issues.push({
          type: 'sensitive_word',
          message: `AI检测到不当内容: ${result.reasoning}`,
          severity: result.suggestedAction === 'block' ? 'error' : 'warning',
        });
      }

      // 根据置信度添加额外警告
      if (result.confidence < this.confidenceThreshold && result.categories.length > 0) {
        issues.push({
          type: 'sensitive_word',
          message: `AI检测到可疑内容类别: ${result.categories.join(', ')}`,
          severity: 'warning',
        });
      }

      return issues;
    } catch (error) {
      logger.error('AI content filter error:', error);
      // AI服务失败时不阻止内容，但记录日志
      return [];
    }
  }

  /**
   * 使用AI分析内容
   */
  private async analyzeContent(content: string): Promise<AIFilterResult> {
    const prompt = this.buildAnalysisPrompt(content);

    const response = await geminiService.generateContent(prompt, {
      temperature: 0.1, // 低温度确保一致性
      maxTokens: 200,
      useCache: true,
      cacheKey: `ai_filter_${this.hashContent(content)}`,
      cacheTTL: 3600, // 1小时缓存
    });

    return this.parseAIResponse(response.content);
  }

  /**
   * 构建AI分析提示词
   */
  private buildAnalysisPrompt(content: string): string {
    return `
请分析以下内容是否适合在教育平台上发布。请从以下维度评估：

1. 是否包含敏感词汇、不当言论
2. 是否包含暴力、色情、政治敏感内容
3. 是否包含歧视性语言
4. 是否包含虚假信息或误导性内容
5. 是否符合教育平台的内容标准

内容：
"""
${content}
"""

请以JSON格式回复，包含以下字段：
{
  "isAppropriate": boolean,
  "confidence": number (0-1),
  "categories": string[] (问题类别),
  "reasoning": string (简短说明),
  "suggestedAction": "allow" | "review" | "block"
}

注意：
- confidence表示判断的置信度
- categories包含检测到的问题类别
- reasoning提供简短的判断理由
- suggestedAction建议采取的行动
`;
  }

  /**
   * 解析AI响应
   */
  private parseAIResponse(response: string): AIFilterResult {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
      const dimensionScores = this.normalizeDimensionScores(parsed.dimensionScores);
      const suggestedAction = ['allow', 'review', 'block'].includes(parsed.suggestedAction)
        ? parsed.suggestedAction
        : 'allow';
      const riskLevel = this.evaluateRiskLevel(dimensionScores, suggestedAction, categories);

      return {
        isAppropriate: parsed.isAppropriate ?? true,
        confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
        categories,
        reasoning: parsed.reasoning || '无具体说明',
        suggestedAction,
        dimensionScores,
        riskLevel,
      };
    } catch (error) {
      logger.warn('Failed to parse AI response:', error);

      // 降级处理：基于关键词简单判断
      const lowerContent = response.toLowerCase();
      const hasNegativeKeywords = [
        'inappropriate', 'offensive', 'harmful', 'sensitive',
        '不当', '敏感', '有害', '不合适',
      ].some(keyword => lowerContent.includes(keyword));

      const dimensionScores = this.normalizeDimensionScores();
      const riskLevel: 'low' | 'medium' | 'high' = hasNegativeKeywords ? 'medium' : 'low';

      return {
        isAppropriate: !hasNegativeKeywords,
        confidence: 0.3, // 低置信度
        categories: hasNegativeKeywords ? ['unknown'] : [],
        reasoning: '解析AI响应失败，使用基础判断',
        suggestedAction: hasNegativeKeywords ? 'review' : 'allow',
        dimensionScores,
        riskLevel,
      };
    }
  }

  /**
   * 内容哈希（用于缓存）
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 启用/禁用AI过滤
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 设置置信度阈值
   */
  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
  }

  private normalizeDimensionScores(input?: Record<string, number>): Record<ContentAnalysisDimension, number> {
    const baseScores: Record<ContentAnalysisDimension, number> = Object.values(ContentAnalysisDimension)
      .reduce((acc, dimension) => {
        acc[dimension] = 0;
        return acc;
      }, {} as Record<ContentAnalysisDimension, number>);

    if (!input) {
      return baseScores;
    }

    for (const [key, value] of Object.entries(input)) {
      const normalizedKey = key as ContentAnalysisDimension;
      if (normalizedKey in baseScores) {
        baseScores[normalizedKey] = Math.max(0, Math.min(1, Number(value) || 0));
      }
    }

    return baseScores;
  }

  private evaluateRiskLevel(
    scores: Record<ContentAnalysisDimension, number>,
    action: 'allow' | 'review' | 'block',
    categories: string[],
  ): 'low' | 'medium' | 'high' {
    if (action === 'block') {
      return 'high';
    }

    if (action === 'review') {
      return 'medium';
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore >= 0.8) {
      return 'high';
    }

    if (maxScore >= 0.5 || categories.length > 0) {
      return 'medium';
    }

    return 'low';
  }
}

// 导出默认实例
export const defaultAIContentFilter = new AIContentFilter();
