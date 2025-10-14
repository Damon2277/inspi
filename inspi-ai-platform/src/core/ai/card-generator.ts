/**
 * 教学卡片生成器
 * 实现四种卡片类型的生成逻辑，创建卡片内容模板和提示词
 */

import { logger } from '@/shared/utils/logger';

import { enhancedGeminiService } from './enhanced-gemini-service';

// 卡片类型定义
export enum CardType {
  CONCEPT = 'concept',           // 概念卡片
  EXAMPLE = 'example',           // 示例卡片
  PRACTICE = 'practice',         // 练习卡片
  SUMMARY = 'summary'            // 总结卡片
}

// 卡片内容结构
export interface CardContent {
  id: string;
  type: CardType;
  title: string;
  content: string;
  metadata: {
    subject: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: number; // 分钟
    tags: string[];
    language: string;
  };
  quality: {
    score: number; // 0-100
    factors: {
      clarity: number;
      accuracy: number;
      engagement: number;
      completeness: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// 生成选项
export interface CardGenerationOptions {
  type: CardType;
  subject: string;
  topic: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
  targetAudience?: string;
  learningObjectives?: string[];
  safetyCheck?: boolean;
  customization?: {
    tone?: 'formal' | 'casual' | 'friendly';
    style?: 'detailed' | 'concise' | 'interactive';
    includeExamples?: boolean;
    includeQuestions?: boolean;
  };
}

// 卡片模板
interface CardTemplate {
  type: CardType;
  promptTemplate: string;
  contentStructure: string[];
  validationRules: {
    minLength: number;
    maxLength: number;
    requiredElements: string[];
  };
}

// 内容质量验证结果
export interface QualityValidationResult {
  isValid: boolean;
  score: number;
  factors: {
    clarity: number;
    accuracy: number;
    engagement: number;
    completeness: number;
  };
  issues: string[];
  suggestions: string[];
}

export class CardGenerator {
  private templates: Map<CardType, CardTemplate>;

  constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * 初始化卡片模板
   */
  private initializeTemplates(): void {
    // 概念卡片模板
    this.templates.set(CardType.CONCEPT, {
      type: CardType.CONCEPT,
      promptTemplate: `
作为一名专业的教育内容创作者，请为"{subject}"学科中的"{topic}"主题创建一张概念卡片。

要求：
- 难度级别：{difficulty}
- 目标受众：{targetAudience}
- 语言：{language}
- 风格：{tone}

请按以下结构创建内容：

1. **概念定义**：用简洁明了的语言定义核心概念
2. **关键特征**：列出3-5个主要特征或属性
3. **重要性说明**：解释为什么这个概念重要
4. **记忆技巧**：提供1-2个帮助记忆的方法
{includeExamples ? "5. **简单示例**：给出1-2个具体例子" : ""}

请确保内容：
- 准确无误，符合学术标准
- 语言清晰，适合{difficulty}水平的学习者
- 结构化，便于理解和记忆
- 长度控制在200-400字之间
      `,
      contentStructure: ['definition', 'keyFeatures', 'importance', 'memoryTips', 'examples'],
      validationRules: {
        minLength: 200,
        maxLength: 400,
        requiredElements: ['definition', 'keyFeatures', 'importance'],
      },
    });

    // 示例卡片模板
    this.templates.set(CardType.EXAMPLE, {
      type: CardType.EXAMPLE,
      promptTemplate: `
作为一名专业的教育内容创作者，请为"{subject}"学科中的"{topic}"主题创建一张示例卡片。

要求：
- 难度级别：{difficulty}
- 目标受众：{targetAudience}
- 语言：{language}
- 风格：{style}

请按以下结构创建内容：

1. **示例标题**：简洁描述示例内容
2. **背景介绍**：简要说明示例的背景或场景
3. **详细示例**：提供具体、完整的示例
4. **步骤分解**：将示例分解为清晰的步骤
5. **关键要点**：突出示例中的重要概念或技巧
6. **变式思考**：提供1-2个相关的变式或扩展

请确保内容：
- 示例真实可信，贴近实际应用
- 步骤清晰，逻辑性强
- 突出学习重点
- 长度控制在300-500字之间
      `,
      contentStructure: ['title', 'background', 'example', 'steps', 'keyPoints', 'variations'],
      validationRules: {
        minLength: 300,
        maxLength: 500,
        requiredElements: ['title', 'example', 'steps', 'keyPoints'],
      },
    });

    // 练习卡片模板
    this.templates.set(CardType.PRACTICE, {
      type: CardType.PRACTICE,
      promptTemplate: `
作为一名专业的教育内容创作者，请为"{subject}"学科中的"{topic}"主题创建一张练习卡片。

要求：
- 难度级别：{difficulty}
- 目标受众：{targetAudience}
- 语言：{language}
- 学习目标：{learningObjectives}

请按以下结构创建内容：

1. **练习目标**：明确说明通过练习要达到的学习目标
2. **知识回顾**：简要回顾相关的核心概念（2-3个要点）
3. **练习题目**：设计2-3个递进式的练习题
4. **解题提示**：为每个题目提供思路提示
5. **参考答案**：提供详细的解答过程
6. **拓展练习**：提供1个更有挑战性的题目

请确保内容：
- 题目设计合理，难度适中
- 涵盖核心知识点
- 提供充分的指导和反馈
- 长度控制在400-600字之间
      `,
      contentStructure: ['objective', 'review', 'exercises', 'hints', 'answers', 'extension'],
      validationRules: {
        minLength: 400,
        maxLength: 600,
        requiredElements: ['objective', 'exercises', 'answers'],
      },
    });

    // 总结卡片模板
    this.templates.set(CardType.SUMMARY, {
      type: CardType.SUMMARY,
      promptTemplate: `
作为一名专业的教育内容创作者，请为"{subject}"学科中的"{topic}"主题创建一张总结卡片。

要求：
- 难度级别：{difficulty}
- 目标受众：{targetAudience}
- 语言：{language}
- 风格：{style}

请按以下结构创建内容：

1. **主题概述**：用1-2句话概括主题的核心内容
2. **关键概念**：列出3-5个最重要的概念或知识点
3. **核心原理**：总结主要的原理、规律或方法
4. **应用场景**：说明知识的实际应用领域
5. **学习要点**：提供3-4个学习和记忆的要点
6. **延伸思考**：提出1-2个深入思考的问题

请确保内容：
- 全面覆盖主题要点
- 结构清晰，层次分明
- 便于复习和记忆
- 长度控制在250-400字之间
      `,
      contentStructure: ['overview', 'keyConcepts', 'principles', 'applications', 'studyTips', 'reflection'],
      validationRules: {
        minLength: 250,
        maxLength: 400,
        requiredElements: ['overview', 'keyConcepts', 'principles'],
      },
    });
  }

  /**
   * 生成教学卡片
   */
  async generateCard(options: CardGenerationOptions): Promise<CardContent> {
    const startTime = Date.now();
    const cardId = this.generateCardId();

    logger.info('开始生成教学卡片', {
      cardId,
      type: options.type,
      subject: options.subject,
      topic: options.topic,
    });

    try {
      // 获取模板
      const template = this.templates.get(options.type);
      if (!template) {
        throw new Error(`不支持的卡片类型: ${options.type}`);
      }

      // 构建提示词
      const prompt = this.buildPrompt(template, options);

      // 生成内容
      const aiResult = await enhancedGeminiService.generateContent(prompt, {
        temperature: 0.7,
        maxTokens: 1000,
        useCache: true,
        cacheKey: this.generateCacheKey(options),
      });

      // 解析和验证内容
      const parsedContent = this.parseGeneratedContent(aiResult.content, template);
      const qualityResult = await this.validateContentQuality(parsedContent, template, options);

      if (!qualityResult.isValid) {
        logger.warn('生成的卡片内容质量不达标', {
          cardId,
          score: qualityResult.score,
          issues: qualityResult.issues,
        });

        // 如果质量不达标，尝试重新生成
        if (qualityResult.score < 60) {
          return this.regenerateCard(options, qualityResult.suggestions);
        }
      }

      // 构建卡片内容
      const cardContent: CardContent = {
        id: cardId,
        type: options.type,
        title: this.extractTitle(parsedContent, options),
        content: parsedContent,
        metadata: {
          subject: options.subject,
          difficulty: options.difficulty || 'intermediate',
          estimatedTime: this.estimateReadingTime(parsedContent),
          tags: this.extractTags(options),
          language: options.language || 'zh-CN',
        },
        quality: {
          score: qualityResult.score,
          factors: qualityResult.factors,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const duration = Date.now() - startTime;
      logger.info('教学卡片生成完成', {
        cardId,
        duration,
        qualityScore: qualityResult.score,
        contentLength: parsedContent.length,
      });

      return cardContent;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('教学卡片生成失败', {
        cardId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });
      throw error;
    }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(template: CardTemplate, options: CardGenerationOptions): string {
    let prompt = template.promptTemplate;

    // 替换模板变量
    const replacements = {
      subject: options.subject,
      topic: options.topic,
      difficulty: options.difficulty || 'intermediate',
      targetAudience: options.targetAudience || '学生',
      language: options.language || '中文',
      tone: options.customization?.tone || 'friendly',
      style: options.customization?.style || 'detailed',
      learningObjectives: options.learningObjectives?.join(', ') || '掌握核心概念',
      includeExamples: options.customization?.includeExamples !== false,
      includeQuestions: options.customization?.includeQuestions !== false,
    };

    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      prompt = prompt.replace(regex, String(value));
    });

    return prompt;
  }

  /**
   * 解析生成的内容
   */
  private parseGeneratedContent(content: string, template: CardTemplate): string {
    // 清理和格式化内容
    let parsed = content.trim();

    // 移除可能的AI回复前缀
    parsed = parsed.replace(/^(好的|当然|我来为您创建|让我来创建).*?[:：]\s*/i, '');

    // 确保内容结构完整
    const requiredElements = template.validationRules.requiredElements;
    for (const element of requiredElements) {
      if (!this.containsElement(parsed, element)) {
        logger.warn(`生成的内容缺少必需元素: ${element}`);
      }
    }

    return parsed;
  }

  /**
   * 验证内容质量
   */
  private async validateContentQuality(
    content: string,
    template: CardTemplate,
    options: CardGenerationOptions,
  ): Promise<QualityValidationResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 长度检查
    const length = content.length;
    if (length < template.validationRules.minLength) {
      issues.push(`内容过短 (${length}字，最少需要${template.validationRules.minLength}字)`);
      suggestions.push('请增加更多详细说明和例子');
    }
    if (length > template.validationRules.maxLength) {
      issues.push(`内容过长 (${length}字，最多${template.validationRules.maxLength}字)`);
      suggestions.push('请精简内容，突出重点');
    }

    // 结构完整性检查
    const missingElements = template.validationRules.requiredElements.filter(
      element => !this.containsElement(content, element),
    );
    if (missingElements.length > 0) {
      issues.push(`缺少必需元素: ${missingElements.join(', ')}`);
      suggestions.push('请确保包含所有必需的内容结构');
    }

    // 计算质量分数
    const factors = {
      clarity: this.assessClarity(content),
      accuracy: this.assessAccuracy(content, options),
      engagement: this.assessEngagement(content),
      completeness: this.assessCompleteness(content, template),
    };

    const score = Math.round(
      (factors.clarity + factors.accuracy + factors.engagement + factors.completeness) / 4,
    );

    return {
      isValid: issues.length === 0 && score >= 70,
      score,
      factors,
      issues,
      suggestions,
    };
  }

  /**
   * 重新生成卡片（质量不达标时）
   */
  private async regenerateCard(
    options: CardGenerationOptions,
    suggestions: string[],
  ): Promise<CardContent> {
    logger.info('重新生成卡片', { suggestions });

    // 修改选项以提高质量
    const improvedOptions: CardGenerationOptions = {
      ...options,
      customization: {
        ...options.customization,
        style: 'detailed' as const,
        includeExamples: true,
      },
    };

    return this.generateCard(improvedOptions);
  }

  /**
   * 评估内容清晰度
   */
  private assessClarity(content: string): number {
    let score = 80; // 基础分

    // 检查结构化程度
    const hasNumberedList = /\d+\.\s/.test(content);
    const hasBulletPoints = /[•\-\*]\s/.test(content);
    const hasHeaders = /\*\*.*?\*\*/.test(content);

    if (hasNumberedList || hasBulletPoints) score += 10;
    if (hasHeaders) score += 10;

    // 检查句子长度
    const sentences = content.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;

    if (avgSentenceLength > 50) score -= 10; // 句子过长扣分
    if (avgSentenceLength < 15) score -= 5;  // 句子过短扣分

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 评估内容准确性
   */
  private assessAccuracy(content: string, options: CardGenerationOptions): number {
    let score = 85; // 基础分

    // 检查是否包含主题相关内容
    const topicKeywords = options.topic.split(/\s+/);
    const contentLower = content.toLowerCase();
    const topicMentions = topicKeywords.filter(keyword =>
      contentLower.includes(keyword.toLowerCase()),
    ).length;

    if (topicMentions / topicKeywords.length < 0.5) {
      score -= 15; // 主题相关性不足
    }

    // 检查是否有明显错误标识
    const errorIndicators = ['错误', '不正确', '有误', 'error', 'incorrect'];
    const hasErrors = errorIndicators.some(indicator =>
      contentLower.includes(indicator),
    );

    if (hasErrors) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 评估内容吸引力
   */
  private assessEngagement(content: string): number {
    let score = 75; // 基础分

    // 检查是否有互动元素
    const hasQuestions = /[？?]/.test(content);
    const hasExamples = /例如|比如|举例|示例|for example/i.test(content);
    const hasCallToAction = /思考|尝试|练习|试试/i.test(content);

    if (hasQuestions) score += 10;
    if (hasExamples) score += 10;
    if (hasCallToAction) score += 5;

    // 检查语言风格
    const friendlyWords = ['我们', '你', '您', '一起', '让我们'];
    const friendlyCount = friendlyWords.filter(word => content.includes(word)).length;
    score += friendlyCount * 2;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 评估内容完整性
   */
  private assessCompleteness(content: string, template: CardTemplate): number {
    let score = 70; // 基础分

    // 检查必需元素
    const requiredElements = template.validationRules.requiredElements;
    const presentElements = requiredElements.filter(element =>
      this.containsElement(content, element),
    );

    const completenessRatio = presentElements.length / requiredElements.length;
    score += completenessRatio * 30;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 检查内容是否包含特定元素
   */
  private containsElement(content: string, element: string): boolean {
    const elementPatterns: Record<string, RegExp> = {
      definition: /定义|概念|是指|指的是/,
      keyFeatures: /特征|特点|属性|要素/,
      importance: /重要|意义|作用|价值/,
      memoryTips: /记忆|技巧|方法|诀窍/,
      examples: /例子|示例|举例|比如/,
      title: /标题|题目/,
      background: /背景|介绍|说明/,
      steps: /步骤|过程|方法/,
      keyPoints: /要点|重点|关键/,
      variations: /变式|扩展|延伸/,
      objective: /目标|目的/,
      review: /回顾|复习/,
      exercises: /练习|题目|问题/,
      hints: /提示|线索|思路/,
      answers: /答案|解答|解决/,
      extension: /拓展|进阶|挑战/,
      overview: /概述|总结|概括/,
      keyConcepts: /概念|要点|知识点/,
      principles: /原理|规律|法则/,
      applications: /应用|实践|运用/,
      studyTips: /学习|要点|建议/,
      reflection: /思考|反思|问题/,
    };

    const pattern = elementPatterns[element];
    return pattern ? pattern.test(content) : false;
  }

  /**
   * 提取卡片标题
   */
  private extractTitle(content: string, options: CardGenerationOptions): string {
    // 尝试从内容中提取标题
    const titleMatch = content.match(/^#\s*(.+)$/m) ||
                      content.match(/^\*\*(.+?)\*\*$/m) ||
                      content.match(/^(.+?)[:：]/m);

    if (titleMatch) {
      return titleMatch[1].trim();
    }

    // 生成默认标题
    const typeNames = {
      [CardType.CONCEPT]: '概念卡片',
      [CardType.EXAMPLE]: '示例卡片',
      [CardType.PRACTICE]: '练习卡片',
      [CardType.SUMMARY]: '总结卡片',
    };

    return `${options.subject} - ${options.topic} ${typeNames[options.type]}`;
  }

  /**
   * 估算阅读时间
   */
  private estimateReadingTime(content: string): number {
    const wordsPerMinute = 200; // 中文阅读速度
    const wordCount = content.length;
    return Math.max(1, Math.round(wordCount / wordsPerMinute));
  }

  /**
   * 提取标签
   */
  private extractTags(options: CardGenerationOptions): string[] {
    const tags = [options.subject, options.topic, options.type];

    if (options.difficulty) {
      tags.push(options.difficulty);
    }

    if (options.targetAudience) {
      tags.push(options.targetAudience);
    }

    return [...new Set(tags)]; // 去重
  }

  /**
   * 生成卡片ID
   */
  private generateCardId(): string {
    return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(options: CardGenerationOptions): string {
    const key = `${options.type}_${options.subject}_${options.topic}_${options.difficulty || 'default'}`;
    return `card_generator:${Buffer.from(key).toString('base64')}`;
  }

  /**
   * 获取支持的卡片类型
   */
  getSupportedCardTypes(): CardType[] {
    return Array.from(this.templates.keys());
  }

  /**
   * 获取卡片模板信息
   */
  getTemplateInfo(type: CardType): Omit<CardTemplate, 'promptTemplate'> | null {
    const template = this.templates.get(type);
    if (!template) return null;

    return {
      type: template.type,
      contentStructure: template.contentStructure,
      validationRules: template.validationRules,
    };
  }
}

// 单例实例
export const cardGenerator = new CardGenerator();
