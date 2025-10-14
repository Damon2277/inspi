/**
 * AI服务集成测试
 * 测试卡片生成器、内容安全验证和API接口的集成功能
 */

import { cardGenerator, CardType } from '@/core/ai/card-generator';
import { contentSafetyValidator, ViolationType } from '@/core/ai/content-safety';
import { enhancedGeminiService } from '@/core/ai/enhanced-gemini-service';

// Mock dependencies
jest.mock('@/core/ai/enhanced-gemini-service');
jest.mock('@/lib/utils/logger');
jest.mock('@/lib/cache/simple-redis');

describe('AI服务集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Gemini service response
    (enhancedGeminiService.generateContent as jest.Mock).mockResolvedValue({
      content: `
# 数学概念：函数

## 概念定义
函数是数学中的一个基本概念，表示两个集合之间的对应关系。

## 关键特征
1. 定义域：函数的输入值集合
2. 值域：函数的输出值集合
3. 对应关系：每个输入值对应唯一的输出值

## 重要性说明
函数是数学分析的基础，在科学和工程中有广泛应用。

## 记忆技巧
可以把函数想象成一台机器，输入原料，输出产品。

## 简单示例
f(x) = 2x + 1 是一个简单的线性函数。
      `,
      model: 'gemini-1.5-flash',
      cached: false,
      requestId: 'test-req-123',
      timestamp: Date.now(),
    });
  });

  describe('卡片生成器', () => {
    it('应该成功生成概念卡片', async () => {
      const options = {
        type: CardType.CONCEPT,
        subject: '数学',
        topic: '函数',
        difficulty: 'intermediate' as const,
        targetAudience: '高中生',
      };

      const result = await cardGenerator.generateCard(options);

      expect(result).toMatchObject({
        type: CardType.CONCEPT,
        metadata: {
          subject: '数学',
          difficulty: 'intermediate',
          language: 'zh-CN',
        },
      });
      expect(result.id).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.content).toContain('函数');
      expect(result.quality.score).toBeGreaterThan(0);
    });

    it('应该生成不同类型的卡片', async () => {
      const types = [CardType.CONCEPT, CardType.EXAMPLE, CardType.PRACTICE, CardType.SUMMARY];

      for (const type of types) {
        const options = {
          type,
          subject: '物理',
          topic: '牛顿定律',
          difficulty: 'beginner' as const,
        };

        const result = await cardGenerator.generateCard(options);
        expect(result.type).toBe(type);
      }
    });

    it('应该支持自定义选项', async () => {
      const options = {
        type: CardType.EXAMPLE,
        subject: '化学',
        topic: '化学反应',
        difficulty: 'advanced' as const,
        customization: {
          tone: 'formal' as const,
          style: 'detailed' as const,
          includeExamples: true,
          includeQuestions: true,
        },
      };

      const result = await cardGenerator.generateCard(options);
      expect(result.metadata.difficulty).toBe('advanced');
    });

    it('应该估算正确的阅读时间', async () => {
      const options = {
        type: CardType.SUMMARY,
        subject: '生物',
        topic: '细胞结构',
      };

      const result = await cardGenerator.generateCard(options);
      expect(result.metadata.estimatedTime).toBeGreaterThan(0);
      expect(result.metadata.estimatedTime).toBeLessThan(10); // 合理的阅读时间
    });
  });

  describe('内容安全验证', () => {
    it('应该通过安全内容的检查', async () => {
      const safeContent = '这是一个关于数学函数的教学内容，包含定义、特征和示例。';

      const result = await contentSafetyValidator.checkContentSafety(safeContent);

      expect(result.isSafe).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.score).toBeGreaterThan(80);
      expect(result.violations).toHaveLength(0);
    });

    it('应该检测敏感词汇', async () => {
      const unsafeContent = '这个内容包含暴力和不当的描述。';

      const result = await contentSafetyValidator.checkContentSafety(unsafeContent);

      expect(result.isSafe).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      // 检查是否包含暴力或敏感词违规
      const hasViolenceOrSensitive = result.violations.some(v =>
        v.type === ViolationType.VIOLENCE || v.type === ViolationType.SENSITIVE_WORDS,
      );
      expect(hasViolenceOrSensitive).toBe(true);
    });

    it('应该评估内容质量', async () => {
      const educationalContent = `
        # 学习目标
        通过本节课，学生将能够理解和掌握函数的基本概念。
        
        ## 重要概念
        函数是数学中的核心概念，具有重要的教育价值。
        
        ## 实践应用
        让我们通过例子来理解函数的应用。
      `;

      const qualityResult = await contentSafetyValidator.evaluateContentQuality(
        educationalContent,
        { type: 'concept', subject: '数学' },
      );

      expect(qualityResult.overall).toBeGreaterThan(60);
      expect(qualityResult.factors.educational).toBeGreaterThan(60);
      expect(qualityResult.factors.clarity).toBeGreaterThan(50);
    });

    it('应该提供改进建议', async () => {
      const poorContent = '这是一个很短的内容。';

      const result = await contentSafetyValidator.checkContentSafety(poorContent);

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('应该处理申诉请求', async () => {
      const appealRequest = {
        contentId: 'content-123',
        checkId: 'check-456',
        reason: '内容被误判为不安全',
        evidence: '这是教育内容的证据',
        submittedBy: 'user-789',
        submittedAt: new Date(),
      };

      const appealId = await contentSafetyValidator.submitAppeal(appealRequest);

      expect(appealId).toBeDefined();
      expect(appealId).toMatch(/^appeal_/);
    });
  });

  describe('服务集成', () => {
    it('应该完整地生成和验证卡片', async () => {
      const options = {
        type: CardType.CONCEPT,
        subject: '数学',
        topic: '函数',
        difficulty: 'intermediate' as const,
        safetyCheck: true,
      };

      // 生成卡片
      const card = await cardGenerator.generateCard(options);
      expect(card).toBeDefined();

      // 安全检查
      const safetyResult = await contentSafetyValidator.checkContentSafety(
        card.content,
        {
          type: options.type,
          subject: options.subject,
        },
      );

      expect(safetyResult).toBeDefined();
      expect(safetyResult.checkId).toBeDefined();

      // 质量评估
      const qualityResult = await contentSafetyValidator.evaluateContentQuality(
        card.content,
        {
          type: options.type,
          subject: options.subject,
        },
      );

      expect(qualityResult).toBeDefined();
      expect(qualityResult.overall).toBeGreaterThan(0);
    });

    it('应该处理生成失败的情况', async () => {
      // Mock失败的响应
      (enhancedGeminiService.generateContent as jest.Mock).mockRejectedValueOnce(
        new Error('AI service unavailable'),
      );

      const options = {
        type: CardType.CONCEPT,
        subject: '数学',
        topic: '函数',
      };

      await expect(cardGenerator.generateCard(options)).rejects.toThrow('AI service unavailable');
    });

    it('应该处理内容质量不达标的情况', async () => {
      // Mock低质量内容
      (enhancedGeminiService.generateContent as jest.Mock).mockResolvedValueOnce({
        content: '短内容',
        model: 'gemini-1.5-flash',
        cached: false,
        requestId: 'test-req-456',
        timestamp: Date.now(),
      });

      const options = {
        type: CardType.CONCEPT,
        subject: '数学',
        topic: '函数',
      };

      // 应该尝试重新生成
      const result = await cardGenerator.generateCard(options);
      expect(result).toBeDefined();
    });
  });

  describe('模板系统', () => {
    it('应该返回支持的卡片类型', () => {
      const supportedTypes = cardGenerator.getSupportedCardTypes();

      expect(supportedTypes).toContain(CardType.CONCEPT);
      expect(supportedTypes).toContain(CardType.EXAMPLE);
      expect(supportedTypes).toContain(CardType.PRACTICE);
      expect(supportedTypes).toContain(CardType.SUMMARY);
    });

    it('应该返回模板信息', () => {
      const templateInfo = cardGenerator.getTemplateInfo(CardType.CONCEPT);

      expect(templateInfo).toBeDefined();
      expect(templateInfo?.type).toBe(CardType.CONCEPT);
      expect(templateInfo?.contentStructure).toBeDefined();
      expect(templateInfo?.validationRules).toBeDefined();
    });

    it('应该处理不存在的模板类型', () => {
      const templateInfo = cardGenerator.getTemplateInfo('invalid' as CardType);
      expect(templateInfo).toBeNull();
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的卡片类型', async () => {
      const options = {
        type: 'invalid' as CardType,
        subject: '数学',
        topic: '函数',
      };

      await expect(cardGenerator.generateCard(options)).rejects.toThrow('不支持的卡片类型');
    });

    it('应该处理空内容', async () => {
      (enhancedGeminiService.generateContent as jest.Mock).mockResolvedValueOnce({
        content: '',
        model: 'gemini-1.5-flash',
        cached: false,
        requestId: 'test-req-789',
        timestamp: Date.now(),
      });

      const options = {
        type: CardType.CONCEPT,
        subject: '数学',
        topic: '函数',
      };

      // 空内容应该导致质量分数较低，但不一定抛出错误
      const result = await cardGenerator.generateCard(options);
      expect(result.content).toBeDefined();
      // 空内容会被处理，系统会生成默认标题
      expect(result.title).toContain('概念卡片');
    });
  });

  describe('缓存机制', () => {
    it('应该使用缓存键生成卡片', async () => {
      const options = {
        type: CardType.CONCEPT,
        subject: '数学',
        topic: '函数',
        difficulty: 'intermediate' as const,
      };

      await cardGenerator.generateCard(options);

      expect(enhancedGeminiService.generateContent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          useCache: true,
          cacheKey: expect.any(String),
        }),
      );
    });
  });
});
