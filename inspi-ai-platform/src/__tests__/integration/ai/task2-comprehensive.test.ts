/**
 * Task 2 - AI核心功能全面集成测试
 * 测试所有AI服务的完整工作流程和集成功能
 */

import { NextRequest } from 'next/server';

import { POST as generateAPI, GET as getGenerateAPI } from '@/app/api/ai/generate/route';
import { POST as generateCardAPI, GET as getCardAPI } from '@/app/api/ai/generate-card/route';
import { GET as healthAPI } from '@/app/api/ai/health/route';
import { cardGenerator, CardType } from '@/core/ai/card-generator';
import { contentSafetyValidator, ViolationType } from '@/core/ai/content-safety';
import { enhancedGeminiService } from '@/core/ai/enhanced-gemini-service';

// Mock dependencies
jest.mock('@/core/ai/enhanced-gemini-service');
jest.mock('@/lib/utils/logger');
jest.mock('@/lib/cache/simple-redis');

// Mock environment
const mockEnv = {
  AI: {
    GEMINI_API_KEY: 'test-api-key-for-integration',
    DEFAULT_MODEL: 'gemini-1.5-flash',
    SERVICE_TIMEOUT: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
  },
  CACHE: {
    TTL: 3600,
  },
};

jest.mock('@/config/environment', () => ({
  env: mockEnv,
}));

describe('Task 2 - AI核心功能全面测试', () => {
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful AI response
    mockGenerateContent = jest.fn().mockResolvedValue({
      content: `
# 数学概念：函数

## 概念定义
函数是数学中描述两个变量之间对应关系的重要概念。对于集合A中的每一个元素x，在集合B中都有唯一确定的元素y与之对应。

## 关键特征
1. **定义域**：函数的输入值集合，通常用D(f)表示
2. **值域**：函数的输出值集合，是定义域在函数作用下的像
3. **对应关系**：每个输入值对应唯一的输出值，这是函数的本质特征
4. **函数符号**：通常用f(x)、g(x)等符号表示

## 重要性说明
函数概念是现代数学的基础，在代数、几何、微积分等各个分支中都有广泛应用。掌握函数概念对于理解数学的整体结构具有重要意义。

## 记忆技巧
1. **机器类比法**：把函数想象成一台机器，输入原料x，输出产品f(x)
2. **映射图像法**：用箭头图表示输入和输出的对应关系

## 简单示例
- 线性函数：f(x) = 2x + 1
- 二次函数：f(x) = x² - 3x + 2
- 反比例函数：f(x) = 1/x
      `,
      model: 'gemini-1.5-flash',
      cached: false,
      requestId: 'test-req-integration',
      timestamp: Date.now(),
    });

    (enhancedGeminiService.generateContent as jest.Mock) = mockGenerateContent;
    (enhancedGeminiService.isAvailable as jest.Mock) = jest.fn().mockReturnValue(true);
    (enhancedGeminiService.healthCheck as jest.Mock) = jest.fn().mockResolvedValue(true);
    (enhancedGeminiService.getStatus as jest.Mock) = jest.fn().mockReturnValue({
      service: 'Enhanced Gemini',
      configured: true,
      available: true,
      health: { status: 'healthy', latency: 1200, errorRate: 0 },
    });
  });

  describe('🔧 服务可用性测试', () => {
    it('应该验证所有AI服务都可用', async () => {
      // 测试Gemini服务
      expect(enhancedGeminiService.isAvailable()).toBe(true);

      // 测试健康检查
      const isHealthy = await enhancedGeminiService.healthCheck();
      expect(isHealthy).toBe(true);

      // 测试卡片生成器
      const supportedTypes = cardGenerator.getSupportedCardTypes();
      expect(supportedTypes).toHaveLength(4);
      expect(supportedTypes).toContain(CardType.CONCEPT);

      // 测试内容安全验证器
      const safetyResult = await contentSafetyValidator.checkContentSafety('测试内容');
      expect(safetyResult).toBeDefined();
      expect(safetyResult.checkId).toBeDefined();
    });

    it('应该正确处理服务不可用的情况', async () => {
      (enhancedGeminiService.isAvailable as jest.Mock).mockReturnValue(false);

      const options = {
        type: CardType.CONCEPT,
        subject: '数学',
        topic: '函数',
      };

      await expect(cardGenerator.generateCard(options)).rejects.toThrow();
    });
  });

  describe('🎯 完整工作流程测试', () => {
    it('应该完成完整的卡片生成和验证流程', async () => {
      // 1. 生成卡片
      const cardOptions = {
        type: CardType.CONCEPT,
        subject: '数学',
        topic: '函数',
        difficulty: 'intermediate' as const,
        targetAudience: '高中生',
        customization: {
          tone: 'friendly' as const,
          style: 'detailed' as const,
          includeExamples: true,
        },
      };

      const card = await cardGenerator.generateCard(cardOptions);

      expect(card).toMatchObject({
        type: CardType.CONCEPT,
        metadata: {
          subject: '数学',
          difficulty: 'intermediate',
        },
      });
      expect(card.content).toContain('函数');
      expect(card.quality.score).toBeGreaterThan(70);

      // 2. 安全检查
      const safetyResult = await contentSafetyValidator.checkContentSafety(
        card.content,
        {
          type: cardOptions.type,
          subject: cardOptions.subject,
          targetAudience: cardOptions.targetAudience,
        },
      );

      expect(safetyResult.isSafe).toBe(true);
      expect(safetyResult.riskLevel).toBe('low');
      expect(safetyResult.score).toBeGreaterThan(80);

      // 3. 质量评估
      const qualityResult = await contentSafetyValidator.evaluateContentQuality(
        card.content,
        {
          type: cardOptions.type,
          subject: cardOptions.subject,
          targetAudience: cardOptions.targetAudience,
        },
      );

      expect(qualityResult.overall).toBeGreaterThan(70);
      expect(qualityResult.factors.educational).toBeGreaterThan(60);
      expect(qualityResult.factors.clarity).toBeGreaterThan(60);

      console.log('✅ 完整工作流程测试通过:', {
        cardId: card.id,
        qualityScore: card.quality.score,
        safetyScore: safetyResult.score,
        overallQuality: qualityResult.overall,
      });
    });

    it('应该处理所有四种卡片类型', async () => {
      const cardTypes = [CardType.CONCEPT, CardType.EXAMPLE, CardType.PRACTICE, CardType.SUMMARY];
      const results = [];

      for (const type of cardTypes) {
        const options = {
          type,
          subject: '物理',
          topic: '牛顿定律',
          difficulty: 'beginner' as const,
        };

        const card = await cardGenerator.generateCard(options);
        const safetyResult = await contentSafetyValidator.checkContentSafety(card.content);

        results.push({
          type,
          cardId: card.id,
          contentLength: card.content.length,
          qualityScore: card.quality.score,
          safetyScore: safetyResult.score,
          isSafe: safetyResult.isSafe,
        });

        expect(card.type).toBe(type);
        expect(safetyResult.isSafe).toBe(true);
      }

      console.log('✅ 所有卡片类型测试结果:', results);
    });
  });

  describe('🌐 API端点集成测试', () => {
    it('应该成功调用卡片生成API', async () => {
      const requestBody = {
        type: CardType.CONCEPT,
        subject: '数学',
        topic: '函数',
        difficulty: 'intermediate',
        targetAudience: '高中生',
        customization: {
          tone: 'friendly',
          style: 'detailed',
          includeExamples: true,
        },
      };

      const request = new NextRequest('http://localhost:3000/api/ai/generate-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-user-123',
          'X-User-Tier': 'premium',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await generateCardAPI(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.card).toBeDefined();
      expect(responseData.data.quality).toBeDefined();
      expect(responseData.data.safety).toBeDefined();
      expect(responseData.meta.requestId).toBeDefined();

      console.log('✅ 卡片生成API测试通过:', {
        status: response.status,
        cardId: responseData.data.card.id,
        qualityScore: responseData.data.quality.overall,
        safetyScore: responseData.data.safety.score,
      });
    });

    it('应该正确处理API参数验证', async () => {
      const invalidRequestBody = {
        type: 'invalid-type',
        subject: '',
        topic: 'x'.repeat(200), // 超长主题
      };

      const request = new NextRequest('http://localhost:3000/api/ai/generate-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-user-123',
        },
        body: JSON.stringify(invalidRequestBody),
      });

      const response = await generateCardAPI(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid request parameters');
      expect(responseData.details).toBeDefined();
    });

    it('应该正确处理配额限制', async () => {
      const requestBody = {
        type: CardType.CONCEPT,
        subject: '数学',
        topic: '函数',
      };

      // 模拟免费用户快速发送多个请求
      const requests = Array(15).fill(null).map(() =>
        new NextRequest('http://localhost:3000/api/ai/generate-card', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': 'free-user-123',
            'X-User-Tier': 'free',
          },
          body: JSON.stringify(requestBody),
        }),
      );

      const responses = await Promise.all(
        requests.map(req => generateCardAPI(req)),
      );

      // 前10个请求应该成功，后面的应该被限制
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitCount = responses.filter(r => r.status === 429).length;

      expect(successCount).toBeLessThanOrEqual(10);
      expect(rateLimitCount).toBeGreaterThan(0);

      console.log('✅ 配额限制测试通过:', {
        totalRequests: requests.length,
        successCount,
        rateLimitCount,
      });
    });

    it('应该返回正确的API信息', async () => {
      // 测试获取卡片类型
      const typesRequest = new NextRequest('http://localhost:3000/api/ai/generate-card?action=types');
      const typesResponse = await getCardAPI(typesRequest);
      const typesData = await typesResponse.json();

      expect(typesResponse.status).toBe(200);
      expect(typesData.success).toBe(true);
      expect(typesData.data.supportedTypes).toHaveLength(4);

      // 测试健康检查
      const healthRequest = new NextRequest('http://localhost:3000/api/ai/generate-card?action=health');
      const healthResponse = await getCardAPI(healthRequest);
      const healthData = await healthResponse.json();

      expect(healthResponse.status).toBe(200);
      expect(healthData.data.status).toBe('healthy');

      // 测试指标获取
      const metricsRequest = new NextRequest('http://localhost:3000/api/ai/generate-card?action=metrics');
      const metricsResponse = await getCardAPI(metricsRequest);
      const metricsData = await metricsResponse.json();

      expect(metricsResponse.status).toBe(200);
      expect(metricsData.data.metrics).toBeDefined();
    });
  });

  describe('🛡️ 安全和错误处理测试', () => {
    it('应该检测和处理不安全内容', async () => {
      // Mock生成包含不当内容的响应
      mockGenerateContent.mockResolvedValueOnce({
        content: '这个内容包含暴力和不当的描述，不适合教育使用。',
        model: 'gemini-1.5-flash',
        cached: false,
        requestId: 'test-unsafe-content',
        timestamp: Date.now(),
      });

      const requestBody = {
        type: CardType.CONCEPT,
        subject: '数学',
        topic: '函数',
        safetyCheck: true,
      };

      const request = new NextRequest('http://localhost:3000/api/ai/generate-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-user-safety',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await generateCardAPI(request);
      const responseData = await response.json();

      expect(response.status).toBe(422);
      expect(responseData.error).toBe('Content safety check failed');
      expect(responseData.safety.violations).toBeDefined();
      expect(responseData.safety.suggestions).toBeDefined();
    });

    it('应该处理AI服务错误', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('AI service timeout'));

      const requestBody = {
        type: CardType.CONCEPT,
        subject: '数学',
        topic: '函数',
      };

      const request = new NextRequest('http://localhost:3000/api/ai/generate-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-user-error',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await generateCardAPI(request);
      const responseData = await response.json();

      expect(response.status).toBe(504);
      expect(responseData.error).toBe('Card generation failed');
      expect(responseData.requestId).toBeDefined();
    });

    it('应该处理内容申诉流程', async () => {
      const appealRequest = {
        contentId: 'content-test-123',
        checkId: 'check-test-456',
        reason: '内容被误判为不安全，实际上是正常的教育内容',
        evidence: '这是数学教学内容，不包含任何不当信息',
        submittedBy: 'user-test-789',
        submittedAt: new Date(),
      };

      const appealId = await contentSafetyValidator.submitAppeal(appealRequest);

      expect(appealId).toBeDefined();
      expect(appealId).toMatch(/^appeal_/);

      console.log('✅ 申诉流程测试通过:', { appealId });
    });
  });

  describe('⚡ 性能和并发测试', () => {
    it('应该在合理时间内完成卡片生成', async () => {
      const startTime = Date.now();

      const options = {
        type: CardType.EXAMPLE,
        subject: '化学',
        topic: '化学反应',
        difficulty: 'intermediate' as const,
      };

      const card = await cardGenerator.generateCard(options);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(card).toBeDefined();
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成

      console.log('✅ 性能测试通过:', {
        duration: `${duration}ms`,
        cardLength: card.content.length,
        qualityScore: card.quality.score,
      });
    });

    it('应该支持并发请求', async () => {
      const concurrentRequests = 5;
      const startTime = Date.now();

      const promises = Array(concurrentRequests).fill(null).map((_, index) =>
        cardGenerator.generateCard({
          type: CardType.SUMMARY,
          subject: '生物',
          topic: `细胞结构${index + 1}`,
          difficulty: 'beginner' as const,
        }),
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(card => {
        expect(card).toBeDefined();
        expect(card.id).toBeDefined();
      });

      console.log('✅ 并发测试通过:', {
        concurrentRequests,
        totalDuration: `${totalDuration}ms`,
        averageDuration: `${Math.round(totalDuration / concurrentRequests)}ms`,
        allSuccessful: results.every(r => r !== null),
      });
    });

    it('应该正确处理缓存机制', async () => {
      const options = {
        type: CardType.PRACTICE,
        subject: '物理',
        topic: '力学',
        difficulty: 'advanced' as const,
      };

      // 第一次调用
      const firstCall = await cardGenerator.generateCard(options);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          useCache: true,
          cacheKey: expect.any(String),
        }),
      );

      // 验证缓存键的生成
      const lastCall = mockGenerateContent.mock.calls[mockGenerateContent.mock.calls.length - 1];
      expect(lastCall[1].cacheKey).toMatch(/^card_generator:/);

      console.log('✅ 缓存机制测试通过:', {
        cardId: firstCall.id,
        cacheKeyUsed: lastCall[1].cacheKey,
      });
    });
  });

  describe('📊 监控和指标测试', () => {
    it('应该正确记录API调用指标', async () => {
      const requestBody = {
        type: CardType.CONCEPT,
        subject: '数学',
        topic: '函数',
      };

      // 发送多个请求以生成指标
      const requests = Array(3).fill(null).map(() =>
        new NextRequest('http://localhost:3000/api/ai/generate-card', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': 'metrics-test-user',
          },
          body: JSON.stringify(requestBody),
        }),
      );

      await Promise.all(requests.map(req => generateCardAPI(req)));

      // 获取指标
      const metricsRequest = new NextRequest('http://localhost:3000/api/ai/generate-card?action=metrics');
      const metricsResponse = await getCardAPI(metricsRequest);
      const metricsData = await metricsResponse.json();

      expect(metricsData.data.metrics.totalRequests).toBeGreaterThan(0);
      expect(metricsData.data.metrics.successRate).toBeDefined();
      expect(metricsData.data.metrics.averageResponseTime).toBeDefined();

      console.log('✅ 监控指标测试通过:', metricsData.data.metrics);
    });
  });

  describe('🔄 集成健康检查', () => {
    it('应该通过完整的健康检查', async () => {
      // 1. 基础服务健康检查
      const healthRequest = new NextRequest('http://localhost:3000/api/ai/health');
      const healthResponse = await healthAPI(healthRequest);
      const healthData = await healthResponse.json();

      expect(healthResponse.status).toBe(200);
      expect(healthData.healthy).toBe(true);

      // 2. 生成服务健康检查
      const generateHealthRequest = new NextRequest('http://localhost:3000/api/ai/generate');
      const generateHealthResponse = await getGenerateAPI(generateHealthRequest);
      const generateHealthData = await generateHealthResponse.json();

      expect(generateHealthResponse.status).toBe(200);
      expect(generateHealthData.status.healthy).toBe(true);

      // 3. 卡片生成服务健康检查
      const cardHealthRequest = new NextRequest('http://localhost:3000/api/ai/generate-card?action=health');
      const cardHealthResponse = await getCardAPI(cardHealthRequest);
      const cardHealthData = await cardHealthResponse.json();

      expect(cardHealthResponse.status).toBe(200);
      expect(cardHealthData.data.status).toBe('healthy');

      console.log('✅ 完整健康检查通过:', {
        baseService: healthData.healthy,
        generateService: generateHealthData.status.healthy,
        cardService: cardHealthData.data.status,
      });
    });
  });

  describe('🎓 教育场景端到端测试', () => {
    it('应该完成完整的教学内容创建流程', async () => {
      console.log('🎯 开始教育场景端到端测试...');

      // 场景：老师要为高中数学课创建函数概念的教学内容
      const teachingScenario = {
        subject: '数学',
        topic: '函数',
        targetAudience: '高中生',
        difficulty: 'intermediate' as const,
        learningObjectives: [
          '理解函数的定义',
          '掌握函数的基本性质',
          '能够识别和表示简单函数',
        ],
      };

      const results = [];

      // 1. 创建概念卡片
      const conceptCard = await cardGenerator.generateCard({
        type: CardType.CONCEPT,
        ...teachingScenario,
        customization: {
          tone: 'friendly',
          style: 'detailed',
          includeExamples: true,
        },
      });

      const conceptSafety = await contentSafetyValidator.checkContentSafety(
        conceptCard.content,
        { type: 'concept', subject: teachingScenario.subject, targetAudience: teachingScenario.targetAudience },
      );

      results.push({
        type: 'concept',
        cardId: conceptCard.id,
        qualityScore: conceptCard.quality.score,
        safetyScore: conceptSafety.score,
        isSafe: conceptSafety.isSafe,
      });

      // 2. 创建示例卡片
      const exampleCard = await cardGenerator.generateCard({
        type: CardType.EXAMPLE,
        ...teachingScenario,
        customization: {
          tone: 'friendly',
          style: 'interactive',
          includeExamples: true,
        },
      });

      const exampleSafety = await contentSafetyValidator.checkContentSafety(exampleCard.content);
      results.push({
        type: 'example',
        cardId: exampleCard.id,
        qualityScore: exampleCard.quality.score,
        safetyScore: exampleSafety.score,
        isSafe: exampleSafety.isSafe,
      });

      // 3. 创建练习卡片
      const practiceCard = await cardGenerator.generateCard({
        type: CardType.PRACTICE,
        ...teachingScenario,
        customization: {
          tone: 'formal',
          style: 'detailed',
          includeQuestions: true,
        },
      });

      const practiceSafety = await contentSafetyValidator.checkContentSafety(practiceCard.content);
      results.push({
        type: 'practice',
        cardId: practiceCard.id,
        qualityScore: practiceCard.quality.score,
        safetyScore: practiceSafety.score,
        isSafe: practiceSafety.isSafe,
      });

      // 4. 创建总结卡片
      const summaryCard = await cardGenerator.generateCard({
        type: CardType.SUMMARY,
        ...teachingScenario,
        customization: {
          tone: 'friendly',
          style: 'concise',
        },
      });

      const summarySafety = await contentSafetyValidator.checkContentSafety(summaryCard.content);
      results.push({
        type: 'summary',
        cardId: summaryCard.id,
        qualityScore: summaryCard.quality.score,
        safetyScore: summarySafety.score,
        isSafe: summarySafety.isSafe,
      });

      // 验证所有卡片都成功创建且安全
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.isSafe).toBe(true);
        expect(result.qualityScore).toBeGreaterThan(60);
        expect(result.safetyScore).toBeGreaterThan(70);
      });

      console.log('✅ 教育场景端到端测试完成:', {
        scenario: teachingScenario,
        results,
        averageQuality: Math.round(results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length),
        averageSafety: Math.round(results.reduce((sum, r) => sum + r.safetyScore, 0) / results.length),
        allSafe: results.every(r => r.isSafe),
      });
    });
  });

  afterAll(() => {
    console.log('\n🎉 Task 2 全面测试完成！');
    console.log('测试覆盖范围:');
    console.log('  ✅ 服务可用性测试');
    console.log('  ✅ 完整工作流程测试');
    console.log('  ✅ API端点集成测试');
    console.log('  ✅ 安全和错误处理测试');
    console.log('  ✅ 性能和并发测试');
    console.log('  ✅ 监控和指标测试');
    console.log('  ✅ 集成健康检查');
    console.log('  ✅ 教育场景端到端测试');
  });
});
