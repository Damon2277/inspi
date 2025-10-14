/**
 * AI内容安全验证系统
 * 集成内容安全检查API，实现敏感词过滤和内容审核
 */

import { redisManager } from '@/lib/cache/simple-redis';
import { logger } from '@/shared/utils/logger';

// 安全检查结果
export interface SafetyCheckResult {
  isSafe: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100，越高越安全
  violations: SafetyViolation[];
  suggestions: string[];
  checkId: string;
  timestamp: Date;
}

// 安全违规
export interface SafetyViolation {
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  position?: {
    start: number;
    end: number;
    text: string;
  };
  suggestion?: string;
}

// 违规类型
export enum ViolationType {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SENSITIVE_WORDS = 'sensitive_words',
  VIOLENCE = 'violence',
  HATE_SPEECH = 'hate_speech',
  ADULT_CONTENT = 'adult_content',
  POLITICAL_CONTENT = 'political_content',
  MISINFORMATION = 'misinformation',
  PRIVACY_VIOLATION = 'privacy_violation',
  COPYRIGHT_VIOLATION = 'copyright_violation',
  SPAM = 'spam'
}

// 内容质量评分
export interface ContentQualityScore {
  overall: number;
  factors: {
    educational: number;    // 教育价值
    accuracy: number;       // 准确性
    clarity: number;        // 清晰度
    appropriateness: number; // 适宜性
    engagement: number;     // 吸引力
  };
  recommendations: string[];
}

// 申诉请求
export interface AppealRequest {
  contentId: string;
  checkId: string;
  reason: string;
  evidence?: string;
  submittedBy: string;
  submittedAt: Date;
}

// 申诉状态
export enum AppealStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export class ContentSafetyValidator {
  private sensitiveWords: Set<string>;
  private violationPatterns: Map<ViolationType, RegExp[]>;
  private qualityKeywords: Map<string, number>;

  constructor() {
    this.sensitiveWords = new Set();
    this.violationPatterns = new Map();
    this.qualityKeywords = new Map();
    this.initializeSafetyRules();
  }

  /**
   * 初始化安全规则
   */
  private initializeSafetyRules(): void {
    // 敏感词库
    this.sensitiveWords = new Set([
      // 政治敏感词
      '政治敏感词1', '政治敏感词2',
      // 暴力相关
      '暴力', '血腥', '杀害',
      // 不当内容
      '色情', '赌博', '毒品',
      // 仇恨言论
      '歧视', '仇恨', '种族主义',
    ]);

    // 违规模式
    this.violationPatterns.set(ViolationType.VIOLENCE, [
      /暴力|血腥|杀害|伤害|攻击/gi,
      /打击|殴打|虐待|折磨/gi,
    ]);

    this.violationPatterns.set(ViolationType.HATE_SPEECH, [
      /歧视|仇恨|种族主义|性别歧视/gi,
      /侮辱|诽谤|恶意攻击/gi,
    ]);

    this.violationPatterns.set(ViolationType.ADULT_CONTENT, [
      /色情|成人内容|不雅/gi,
      /性暗示|露骨/gi,
    ]);

    this.violationPatterns.set(ViolationType.POLITICAL_CONTENT, [
      /政治敏感|政府批评|政治立场/gi,
    ]);

    this.violationPatterns.set(ViolationType.MISINFORMATION, [
      /虚假信息|谣言|误导性/gi,
      /未经证实|不实消息/gi,
    ]);

    // 质量关键词
    this.qualityKeywords.set('教育', 10);
    this.qualityKeywords.set('学习', 8);
    this.qualityKeywords.set('知识', 8);
    this.qualityKeywords.set('理解', 6);
    this.qualityKeywords.set('掌握', 6);
    this.qualityKeywords.set('应用', 5);
    this.qualityKeywords.set('实践', 5);
  }

  /**
   * 执行内容安全检查
   */
  async checkContentSafety(content: string, context?: {
    type?: string;
    subject?: string;
    targetAudience?: string;
  }): Promise<SafetyCheckResult> {
    const checkId = this.generateCheckId();
    const startTime = Date.now();

    logger.info('开始内容安全检查', {
      checkId,
      contentLength: content.length,
      context,
    });

    try {
      const violations: SafetyViolation[] = [];

      // 1. 敏感词检查
      const sensitiveWordViolations = this.checkSensitiveWords(content);
      violations.push(...sensitiveWordViolations);

      // 2. 违规模式检查
      const patternViolations = this.checkViolationPatterns(content);
      violations.push(...patternViolations);

      // 3. 上下文相关检查
      if (context) {
        const contextViolations = this.checkContextualSafety(content, context);
        violations.push(...contextViolations);
      }

      // 4. 第三方API检查（如果配置了）
      const thirdPartyViolations = await this.checkWithThirdPartyAPI(content);
      violations.push(...thirdPartyViolations);

      // 计算风险级别和安全分数
      const { riskLevel, score } = this.calculateRiskLevel(violations);
      const isSafe = riskLevel === 'low' && score >= 80;

      // 生成建议
      const suggestions = this.generateSuggestions(violations, score);

      const result: SafetyCheckResult = {
        isSafe,
        riskLevel,
        score,
        violations,
        suggestions,
        checkId,
        timestamp: new Date(),
      };

      // 缓存结果
      await this.cacheCheckResult(checkId, result);

      const duration = Date.now() - startTime;
      logger.info('内容安全检查完成', {
        checkId,
        isSafe,
        riskLevel,
        score,
        violationCount: violations.length,
        duration,
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('内容安全检查失败', {
        checkId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });
      throw error;
    }
  }

  /**
   * 检查敏感词
   */
  private checkSensitiveWords(content: string): SafetyViolation[] {
    const violations: SafetyViolation[] = [];
    const contentLower = content.toLowerCase();

    for (const word of this.sensitiveWords) {
      const index = contentLower.indexOf(word.toLowerCase());
      if (index !== -1) {
        violations.push({
          type: ViolationType.SENSITIVE_WORDS,
          severity: 'high',
          description: `检测到敏感词: ${word}`,
          position: {
            start: index,
            end: index + word.length,
            text: content.substring(index, index + word.length),
          },
          suggestion: '请移除或替换敏感词汇',
        });
      }
    }

    return violations;
  }

  /**
   * 检查违规模式
   */
  private checkViolationPatterns(content: string): SafetyViolation[] {
    const violations: SafetyViolation[] = [];

    for (const [type, patterns] of this.violationPatterns.entries()) {
      for (const pattern of patterns) {
        const matches = Array.from(content.matchAll(pattern));

        for (const match of matches) {
          if (match.index !== undefined) {
            violations.push({
              type,
              severity: this.getSeverityForType(type),
              description: `检测到${this.getTypeDescription(type)}: ${match[0]}`,
              position: {
                start: match.index,
                end: match.index + match[0].length,
                text: match[0],
              },
              suggestion: this.getSuggestionForType(type),
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * 上下文相关安全检查
   */
  private checkContextualSafety(content: string, context: {
    type?: string;
    subject?: string;
    targetAudience?: string;
  }): SafetyViolation[] {
    const violations: SafetyViolation[] = [];

    // 检查内容是否适合目标受众
    if (context.targetAudience) {
      const audienceViolations = this.checkAudienceAppropriateness(content, context.targetAudience);
      violations.push(...audienceViolations);
    }

    // 检查学科相关性
    if (context.subject) {
      const subjectViolations = this.checkSubjectRelevance(content, context.subject);
      violations.push(...subjectViolations);
    }

    return violations;
  }

  /**
   * 第三方API检查
   */
  private async checkWithThirdPartyAPI(content: string): Promise<SafetyViolation[]> {
    const violations: SafetyViolation[] = [];

    try {
      // 这里可以集成百度、腾讯等第三方内容安全API
      // 示例：调用百度内容审核API
      const baiduResult = await this.callBaiduContentAPI(content);
      if (baiduResult && !baiduResult.isSafe) {
        violations.push(...baiduResult.violations);
      }

    } catch (error) {
      logger.warn('第三方API检查失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return violations;
  }

  /**
   * 调用百度内容审核API（示例）
   */
  private async callBaiduContentAPI(content: string): Promise<{
    isSafe: boolean;
    violations: SafetyViolation[];
  } | null> {
    // 这里是示例实现，实际需要配置真实的API
    // 返回模拟结果
    return null;
  }

  /**
   * 检查受众适宜性
   */
  private checkAudienceAppropriateness(content: string, targetAudience: string): SafetyViolation[] {
    const violations: SafetyViolation[] = [];

    // 儿童内容检查
    if (targetAudience.includes('儿童') || targetAudience.includes('小学')) {
      const childUnsafePatterns = [
        /复杂|困难|高深/gi,
        /成人|大人专用/gi,
      ];

      for (const pattern of childUnsafePatterns) {
        const matches = Array.from(content.matchAll(pattern));
        for (const match of matches) {
          if (match.index !== undefined) {
            violations.push({
              type: ViolationType.INAPPROPRIATE_CONTENT,
              severity: 'medium',
              description: `内容可能不适合儿童受众: ${match[0]}`,
              position: {
                start: match.index,
                end: match.index + match[0].length,
                text: match[0],
              },
              suggestion: '请使用更适合儿童理解的语言',
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * 检查学科相关性
   */
  private checkSubjectRelevance(content: string, subject: string): SafetyViolation[] {
    const violations: SafetyViolation[] = [];

    // 检查内容是否偏离学科主题
    const subjectKeywords = this.getSubjectKeywords(subject);
    const contentLower = content.toLowerCase();

    const relevantKeywordCount = subjectKeywords.filter(keyword =>
      contentLower.includes(keyword.toLowerCase()),
    ).length;

    if (relevantKeywordCount === 0 && subjectKeywords.length > 0) {
      violations.push({
        type: ViolationType.INAPPROPRIATE_CONTENT,
        severity: 'low',
        description: `内容与${subject}学科相关性较低`,
        suggestion: `请增加更多与${subject}相关的内容`,
      });
    }

    return violations;
  }

  /**
   * 获取学科关键词
   */
  private getSubjectKeywords(subject: string): string[] {
    const keywordMap: Record<string, string[]> = {
      '数学': ['数学', '计算', '公式', '定理', '证明', '几何', '代数'],
      '语文': ['语文', '文学', '写作', '阅读', '语法', '词汇', '修辞'],
      '英语': ['英语', '语法', '词汇', '听力', '口语', '阅读', '写作'],
      '物理': ['物理', '力学', '电学', '光学', '热学', '原子', '能量'],
      '化学': ['化学', '元素', '分子', '反应', '实验', '化合物', '离子'],
      '生物': ['生物', '细胞', '基因', '进化', '生态', '器官', '生命'],
    };

    return keywordMap[subject] || [];
  }

  /**
   * 计算风险级别和分数
   */
  private calculateRiskLevel(violations: SafetyViolation[]): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    score: number;
  } {
    let score = 100;
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    for (const violation of violations) {
      // 根据严重程度扣分
      switch (violation.severity) {
        case 'low':
          score -= 5;
          break;
        case 'medium':
          score -= 15;
          if (maxSeverity === 'low') maxSeverity = 'medium';
          break;
        case 'high':
          score -= 30;
          if (['low', 'medium'].includes(maxSeverity)) maxSeverity = 'high';
          break;
        case 'critical':
          score -= 50;
          maxSeverity = 'critical';
          break;
      }
    }

    score = Math.max(0, score);

    // 确定风险级别
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (score >= 90) riskLevel = 'low';
    else if (score >= 70) riskLevel = 'medium';
    else if (score >= 50) riskLevel = 'high';
    else riskLevel = 'critical';

    // 使用最高严重程度作为最终风险级别
    if (maxSeverity === 'critical') riskLevel = 'critical';
    else if (maxSeverity === 'high' && riskLevel !== 'critical') riskLevel = 'high';

    return { riskLevel, score };
  }

  /**
   * 生成改进建议
   */
  private generateSuggestions(violations: SafetyViolation[], score: number): string[] {
    const suggestions: string[] = [];

    if (violations.length === 0) {
      suggestions.push('内容安全性良好，无需修改');
      return suggestions;
    }

    // 根据违规类型生成建议
    const violationTypes = new Set(violations.map(v => v.type));

    if (violationTypes.has(ViolationType.SENSITIVE_WORDS)) {
      suggestions.push('请移除或替换敏感词汇，使用更中性的表达');
    }

    if (violationTypes.has(ViolationType.VIOLENCE)) {
      suggestions.push('请避免使用暴力相关的描述，采用更温和的表达方式');
    }

    if (violationTypes.has(ViolationType.INAPPROPRIATE_CONTENT)) {
      suggestions.push('请确保内容适合目标受众，调整语言难度和表达方式');
    }

    if (score < 70) {
      suggestions.push('建议重新审视内容，确保符合教育平台的内容标准');
    }

    return suggestions;
  }

  /**
   * 评估内容质量
   */
  async evaluateContentQuality(content: string, context?: {
    type?: string;
    subject?: string;
    targetAudience?: string;
  }): Promise<ContentQualityScore> {
    const factors = {
      educational: this.assessEducationalValue(content),
      accuracy: this.assessAccuracy(content, context),
      clarity: this.assessClarity(content),
      appropriateness: this.assessAppropriateness(content, context),
      engagement: this.assessEngagement(content),
    };

    const overall = Math.round(
      (factors.educational + factors.accuracy + factors.clarity +
       factors.appropriateness + factors.engagement) / 5,
    );

    const recommendations = this.generateQualityRecommendations(factors);

    return {
      overall,
      factors,
      recommendations,
    };
  }

  /**
   * 评估教育价值
   */
  private assessEducationalValue(content: string): number {
    let score = 60; // 基础分

    // 检查教育关键词
    for (const [keyword, weight] of this.qualityKeywords.entries()) {
      if (content.includes(keyword)) {
        score += weight;
      }
    }

    // 检查结构化程度
    const hasStructure = /\d+\.\s|[•\-\*]\s|\*\*.*?\*\*/.test(content);
    if (hasStructure) score += 10;

    // 检查是否有例子
    const hasExamples = /例如|比如|举例|示例/.test(content);
    if (hasExamples) score += 10;

    return Math.min(100, score);
  }

  /**
   * 评估准确性
   */
  private assessAccuracy(content: string, context?: any): number {
    let score = 80; // 基础分

    // 检查是否有不确定表达
    const uncertainExpressions = /可能|也许|大概|估计|应该是/g;
    const uncertainCount = (content.match(uncertainExpressions) || []).length;
    score -= uncertainCount * 5;

    // 检查是否有绝对化表达
    const absoluteExpressions = /绝对|一定|必须|永远|从不/g;
    const absoluteCount = (content.match(absoluteExpressions) || []).length;
    score -= absoluteCount * 3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 评估清晰度
   */
  private assessClarity(content: string): number {
    let score = 70; // 基础分

    // 句子长度检查
    const sentences = content.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;

    if (avgLength > 50) score -= 15;
    else if (avgLength > 30) score -= 5;
    else if (avgLength < 10) score -= 10;

    // 结构化检查
    const hasHeaders = /\*\*.*?\*\*/.test(content);
    const hasLists = /\d+\.\s|[•\-\*]\s/.test(content);

    if (hasHeaders) score += 10;
    if (hasLists) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 评估适宜性
   */
  private assessAppropriateness(content: string, context?: any): number {
    let score = 85; // 基础分

    // 检查是否有不当内容
    const inappropriatePatterns = [
      /暴力|血腥/gi,
      /色情|不雅/gi,
      /歧视|仇恨/gi,
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(content)) {
        score -= 20;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 评估吸引力
   */
  private assessEngagement(content: string): number {
    let score = 60; // 基础分

    // 检查互动元素
    const hasQuestions = /[？?]/.test(content);
    const hasCallToAction = /思考|尝试|练习|试试/.test(content);
    const hasExamples = /例如|比如|举例/.test(content);

    if (hasQuestions) score += 15;
    if (hasCallToAction) score += 10;
    if (hasExamples) score += 10;

    // 检查语言风格
    const friendlyWords = ['我们', '你', '您', '一起'];
    const friendlyCount = friendlyWords.filter(word => content.includes(word)).length;
    score += friendlyCount * 3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 生成质量改进建议
   */
  private generateQualityRecommendations(factors: ContentQualityScore['factors']): string[] {
    const recommendations: string[] = [];

    if (factors.educational < 70) {
      recommendations.push('增加更多教育性内容，如概念解释、学习要点等');
    }

    if (factors.accuracy < 70) {
      recommendations.push('提高内容准确性，避免不确定或绝对化的表达');
    }

    if (factors.clarity < 70) {
      recommendations.push('改善内容结构，使用标题、列表等提高可读性');
    }

    if (factors.appropriateness < 80) {
      recommendations.push('确保内容适合目标受众，移除不当内容');
    }

    if (factors.engagement < 60) {
      recommendations.push('增加互动元素，如问题、例子、练习等');
    }

    return recommendations;
  }

  /**
   * 提交申诉
   */
  async submitAppeal(appealRequest: AppealRequest): Promise<string> {
    const appealId = this.generateAppealId();

    logger.info('收到内容申诉', {
      appealId,
      contentId: appealRequest.contentId,
      checkId: appealRequest.checkId,
      submittedBy: appealRequest.submittedBy,
    });

    // 存储申诉信息
    await this.storeAppeal(appealId, appealRequest);

    // 触发人工审核流程
    await this.triggerManualReview(appealId, appealRequest);

    return appealId;
  }

  /**
   * 获取违规类型严重程度
   */
  private getSeverityForType(type: ViolationType): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<ViolationType, 'low' | 'medium' | 'high' | 'critical'> = {
      [ViolationType.INAPPROPRIATE_CONTENT]: 'medium',
      [ViolationType.SENSITIVE_WORDS]: 'high',
      [ViolationType.VIOLENCE]: 'critical',
      [ViolationType.HATE_SPEECH]: 'critical',
      [ViolationType.ADULT_CONTENT]: 'critical',
      [ViolationType.POLITICAL_CONTENT]: 'high',
      [ViolationType.MISINFORMATION]: 'high',
      [ViolationType.PRIVACY_VIOLATION]: 'medium',
      [ViolationType.COPYRIGHT_VIOLATION]: 'medium',
      [ViolationType.SPAM]: 'low',
    };

    return severityMap[type] || 'medium';
  }

  /**
   * 获取违规类型描述
   */
  private getTypeDescription(type: ViolationType): string {
    const descriptionMap: Record<ViolationType, string> = {
      [ViolationType.INAPPROPRIATE_CONTENT]: '不当内容',
      [ViolationType.SENSITIVE_WORDS]: '敏感词汇',
      [ViolationType.VIOLENCE]: '暴力内容',
      [ViolationType.HATE_SPEECH]: '仇恨言论',
      [ViolationType.ADULT_CONTENT]: '成人内容',
      [ViolationType.POLITICAL_CONTENT]: '政治敏感内容',
      [ViolationType.MISINFORMATION]: '虚假信息',
      [ViolationType.PRIVACY_VIOLATION]: '隐私违规',
      [ViolationType.COPYRIGHT_VIOLATION]: '版权违规',
      [ViolationType.SPAM]: '垃圾内容',
    };

    return descriptionMap[type] || '未知违规';
  }

  /**
   * 获取违规类型建议
   */
  private getSuggestionForType(type: ViolationType): string {
    const suggestionMap: Record<ViolationType, string> = {
      [ViolationType.INAPPROPRIATE_CONTENT]: '请修改为更合适的内容',
      [ViolationType.SENSITIVE_WORDS]: '请移除或替换敏感词汇',
      [ViolationType.VIOLENCE]: '请避免暴力相关描述',
      [ViolationType.HATE_SPEECH]: '请使用更包容的语言',
      [ViolationType.ADULT_CONTENT]: '请移除成人相关内容',
      [ViolationType.POLITICAL_CONTENT]: '请避免政治敏感话题',
      [ViolationType.MISINFORMATION]: '请确保信息准确性',
      [ViolationType.PRIVACY_VIOLATION]: '请保护个人隐私信息',
      [ViolationType.COPYRIGHT_VIOLATION]: '请确保内容原创性',
      [ViolationType.SPAM]: '请提供有价值的内容',
    };

    return suggestionMap[type] || '请修改相关内容';
  }

  /**
   * 缓存检查结果
   */
  private async cacheCheckResult(checkId: string, result: SafetyCheckResult): Promise<void> {
    try {
      const cacheKey = `safety_check:${checkId}`;
      await redisManager.set(cacheKey, JSON.stringify(result), 86400); // 24小时
    } catch (error) {
      logger.warn('缓存安全检查结果失败', { checkId, error });
    }
  }

  /**
   * 存储申诉信息
   */
  private async storeAppeal(appealId: string, appealRequest: AppealRequest): Promise<void> {
    try {
      const cacheKey = `appeal:${appealId}`;
      const appealData = {
        ...appealRequest,
        appealId,
        status: AppealStatus.PENDING,
        createdAt: new Date(),
      };
      await redisManager.set(cacheKey, JSON.stringify(appealData), 604800); // 7天
    } catch (error) {
      logger.error('存储申诉信息失败', { appealId, error });
    }
  }

  /**
   * 触发人工审核
   */
  private async triggerManualReview(appealId: string, appealRequest: AppealRequest): Promise<void> {
    // 这里可以集成工单系统或通知管理员
    logger.info('触发人工审核', {
      appealId,
      contentId: appealRequest.contentId,
      reason: appealRequest.reason,
    });
  }

  /**
   * 生成检查ID
   */
  private generateCheckId(): string {
    return `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成申诉ID
   */
  private generateAppealId(): string {
    return `appeal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 单例实例
export const contentSafetyValidator = new ContentSafetyValidator();
