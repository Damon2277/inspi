/**
 * Task 2 - AI服务性能基准测试
 * 测试AI服务的性能指标和负载能力
 */

import { cardGenerator, CardType } from '@/core/ai/card-generator';
import { contentSafetyValidator } from '@/core/ai/content-safety';
import { enhancedGeminiService } from '@/core/ai/enhanced-gemini-service';

// Mock dependencies
jest.mock('@/core/ai/enhanced-gemini-service');
jest.mock('@/lib/utils/logger');
jest.mock('@/lib/cache/simple-redis');

describe('Task 2 - AI服务性能基准测试', () => {
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AI response with realistic delay
    mockGenerateContent = jest.fn().mockImplementation(() =>
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            content: `
# 测试内容

这是一个用于性能测试的模拟AI生成内容。内容包含了教育相关的信息，
具有良好的结构和清晰的表达，适合用于教学场景。

## 主要特点
1. 结构清晰
2. 内容丰富
3. 表达准确
4. 适合教学

## 应用场景
可以用于各种教育场景，帮助学生更好地理解相关概念。
            `,
            model: 'gemini-1.5-flash',
            cached: false,
            requestId: `perf-test-${Date.now()}`,
            timestamp: Date.now(),
          });
        }, Math.random() * 1000 + 500); // 500-1500ms 随机延迟
      }),
    );

    (enhancedGeminiService.generateContent as jest.Mock) = mockGenerateContent;
    (enhancedGeminiService.isAvailable as jest.Mock) = jest.fn().mockReturnValue(true);
  });

  describe('📊 单次操作性能测试', () => {
    it('卡片生成性能基准', async () => {
      const iterations = 10;
      const results = [];

      console.log(`🚀 开始卡片生成性能测试 (${iterations} 次迭代)...`);

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        const card = await cardGenerator.generateCard({
          type: CardType.CONCEPT,
          subject: '数学',
          topic: `测试主题${i + 1}`,
          difficulty: 'intermediate' as const,
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        results.push({
          iteration: i + 1,
          duration,
          contentLength: card.content.length,
          qualityScore: card.quality.score,
        });

        expect(card).toBeDefined();
        expect(duration).toBeLessThan(5000); // 应该在5秒内完成
      }

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const minDuration = Math.min(...results.map(r => r.duration));
      const maxDuration = Math.max(...results.map(r => r.duration));
      const avgContentLength = Math.round(results.reduce((sum, r) => sum + r.contentLength, 0) / results.length);
      const avgQualityScore = Math.round(results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length);

      console.log('📈 卡片生成性能结果:', {
        iterations,
        avgDuration: `${Math.round(avgDuration)}ms`,
        minDuration: `${minDuration}ms`,
        maxDuration: `${maxDuration}ms`,
        avgContentLength,
        avgQualityScore,
        throughput: `${Math.round(1000 / avgDuration * 60)} cards/min`,
      });

      // 性能断言
      expect(avgDuration).toBeLessThan(3000); // 平均响应时间应小于3秒
      expect(maxDuration).toBeLessThan(5000); // 最大响应时间应小于5秒
      expect(avgQualityScore).toBeGreaterThan(70); // 平均质量分数应大于70
    });

    it('内容安全检查性能基准', async () => {
      const iterations = 50;
      const testContents = [
        '这是一个正常的教育内容，包含数学概念和示例。',
        '物理学中的牛顿定律是描述物体运动的基本规律。',
        '化学反应是原子重新排列形成新物质的过程。',
        '生物细胞是生命的基本单位，具有完整的生命活动。',
        '历史是人类社会发展的记录和研究。',
      ];

      const results = [];

      console.log(`🛡️ 开始安全检查性能测试 (${iterations} 次迭代)...`);

      for (let i = 0; i < iterations; i++) {
        const content = testContents[i % testContents.length];
        const startTime = Date.now();

        const safetyResult = await contentSafetyValidator.checkContentSafety(content);

        const endTime = Date.now();
        const duration = endTime - startTime;

        results.push({
          iteration: i + 1,
          duration,
          contentLength: content.length,
          safetyScore: safetyResult.score,
          isSafe: safetyResult.isSafe,
        });

        expect(safetyResult).toBeDefined();
        expect(duration).toBeLessThan(1000); // 应该在1秒内完成
      }

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const minDuration = Math.min(...results.map(r => r.duration));
      const maxDuration = Math.max(...results.map(r => r.duration));
      const avgSafetyScore = Math.round(results.reduce((sum, r) => sum + r.safetyScore, 0) / results.length);
      const safetyRate = results.filter(r => r.isSafe).length / results.length * 100;

      console.log('🔒 安全检查性能结果:', {
        iterations,
        avgDuration: `${Math.round(avgDuration)}ms`,
        minDuration: `${minDuration}ms`,
        maxDuration: `${maxDuration}ms`,
        avgSafetyScore,
        safetyRate: `${safetyRate}%`,
        throughput: `${Math.round(1000 / avgDuration)} checks/sec`,
      });

      // 性能断言
      expect(avgDuration).toBeLessThan(500); // 平均响应时间应小于500ms
      expect(maxDuration).toBeLessThan(1000); // 最大响应时间应小于1秒
      expect(safetyRate).toBe(100); // 所有测试内容都应该是安全的
    });

    it('质量评估性能基准', async () => {
      const iterations = 30;
      const testContent = `
# 教学内容示例

这是一个用于测试质量评估性能的教学内容。内容结构清晰，
包含了多个教育要素，适合用于评估系统的性能表现。

## 学习目标
通过本内容，学生将能够：
1. 理解基本概念
2. 掌握核心知识点
3. 应用所学知识

## 重要概念
这里介绍了重要的概念和原理，帮助学生建立知识框架。

## 实践应用
通过具体的例子和练习，让学生能够实际应用所学内容。
      `;

      const results = [];

      console.log(`📝 开始质量评估性能测试 (${iterations} 次迭代)...`);

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        const qualityResult = await contentSafetyValidator.evaluateContentQuality(
          testContent,
          { type: 'concept', subject: '测试学科' },
        );

        const endTime = Date.now();
        const duration = endTime - startTime;

        results.push({
          iteration: i + 1,
          duration,
          overallScore: qualityResult.overall,
          educationalScore: qualityResult.factors.educational,
          clarityScore: qualityResult.factors.clarity,
        });

        expect(qualityResult).toBeDefined();
        expect(duration).toBeLessThan(500); // 应该在500ms内完成
      }

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const avgOverallScore = Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / results.length);
      const avgEducationalScore = Math.round(results.reduce((sum, r) => sum + r.educationalScore, 0) / results.length);

      console.log('📊 质量评估性能结果:', {
        iterations,
        avgDuration: `${Math.round(avgDuration)}ms`,
        avgOverallScore,
        avgEducationalScore,
        throughput: `${Math.round(1000 / avgDuration)} evaluations/sec`,
      });

      // 性能断言
      expect(avgDuration).toBeLessThan(300); // 平均响应时间应小于300ms
      expect(avgOverallScore).toBeGreaterThan(70); // 平均质量分数应大于70
    });
  });

  describe('🔄 并发性能测试', () => {
    it('并发卡片生成压力测试', async () => {
      const concurrency = 10;
      const iterations = 5;

      console.log(`⚡ 开始并发卡片生成测试 (${concurrency} 并发, ${iterations} 轮)...`);

      const allResults = [];

      for (let round = 0; round < iterations; round++) {
        const startTime = Date.now();

        const promises = Array(concurrency).fill(null).map((_, index) =>
          cardGenerator.generateCard({
            type: CardType.EXAMPLE,
            subject: '测试学科',
            topic: `并发测试主题${round}-${index}`,
            difficulty: 'beginner' as const,
          }),
        );

        const results = await Promise.all(promises);
        const endTime = Date.now();
        const roundDuration = endTime - startTime;

        allResults.push({
          round: round + 1,
          duration: roundDuration,
          successCount: results.filter(r => r !== null).length,
          avgQualityScore: Math.round(
            results.reduce((sum, r) => sum + (r?.quality.score || 0), 0) / results.length,
          ),
        });

        expect(results).toHaveLength(concurrency);
        results.forEach(card => {
          expect(card).toBeDefined();
          expect(card.id).toBeDefined();
        });

        console.log(`  Round ${round + 1}: ${roundDuration}ms, ${results.length}/${concurrency} success`);
      }

      const avgRoundDuration = allResults.reduce((sum, r) => sum + r.duration, 0) / allResults.length;
      const totalSuccessRate = allResults.reduce((sum, r) => sum + r.successCount, 0) / (allResults.length * concurrency) * 100;

      console.log('🚀 并发测试结果:', {
        concurrency,
        iterations,
        avgRoundDuration: `${Math.round(avgRoundDuration)}ms`,
        totalSuccessRate: `${totalSuccessRate}%`,
        throughput: `${Math.round(concurrency * 1000 / avgRoundDuration)} cards/sec`,
      });

      // 性能断言
      expect(totalSuccessRate).toBe(100); // 所有请求都应该成功
      expect(avgRoundDuration).toBeLessThan(10000); // 每轮应该在10秒内完成
    });

    it('混合操作并发测试', async () => {
      const concurrency = 15;
      const testContent = '这是用于并发测试的教学内容，包含基本的教育元素。';

      console.log(`🔀 开始混合操作并发测试 (${concurrency} 并发)...`);

      const startTime = Date.now();

      // 创建混合操作：卡片生成 + 安全检查 + 质量评估
      const promises = [];

      // 5个卡片生成任务
      for (let i = 0; i < 5; i++) {
        promises.push(
          cardGenerator.generateCard({
            type: CardType.SUMMARY,
            subject: '混合测试',
            topic: `主题${i}`,
            difficulty: 'intermediate' as const,
          }),
        );
      }

      // 5个安全检查任务
      for (let i = 0; i < 5; i++) {
        promises.push(
          contentSafetyValidator.checkContentSafety(`${testContent} 变体${i}`),
        );
      }

      // 5个质量评估任务
      for (let i = 0; i < 5; i++) {
        promises.push(
          contentSafetyValidator.evaluateContentQuality(
            `${testContent} 质量测试${i}`,
            { type: 'concept', subject: '测试' },
          ),
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      const cardResults = results.slice(0, 5);
      const safetyResults = results.slice(5, 10);
      const qualityResults = results.slice(10, 15);

      console.log('🎯 混合操作测试结果:', {
        totalDuration: `${totalDuration}ms`,
        cardGeneration: {
          count: cardResults.length,
          allSuccessful: cardResults.every(r => r && r.id),
        },
        safetyChecks: {
          count: safetyResults.length,
          allSafe: safetyResults.every(r => r && r.isSafe),
          avgScore: Math.round(safetyResults.reduce((sum, r) => sum + (r?.score || 0), 0) / safetyResults.length),
        },
        qualityEvaluations: {
          count: qualityResults.length,
          avgScore: Math.round(qualityResults.reduce((sum, r) => sum + (r?.overall || 0), 0) / qualityResults.length),
        },
        throughput: `${Math.round(concurrency * 1000 / totalDuration)} ops/sec`,
      });

      // 性能断言
      expect(results).toHaveLength(concurrency);
      expect(cardResults.every(r => r && r.id)).toBe(true);
      expect(safetyResults.every(r => r && r.isSafe)).toBe(true);
      expect(totalDuration).toBeLessThan(15000); // 应该在15秒内完成
    });
  });

  describe('📈 负载测试', () => {
    it('持续负载测试', async () => {
      const duration = 10000; // 10秒测试
      const interval = 200; // 每200ms一个请求
      const expectedRequests = Math.floor(duration / interval);

      console.log(`⏱️ 开始持续负载测试 (${duration}ms, 每${interval}ms一个请求)...`);

      const results = [];
      const startTime = Date.now();
      let requestCount = 0;

      const testPromise = new Promise<void>((resolve) => {
        const intervalId = setInterval(async () => {
          if (Date.now() - startTime >= duration) {
            clearInterval(intervalId);
            resolve();
            return;
          }

          requestCount++;
          const reqStartTime = Date.now();

          try {
            const safetyResult = await contentSafetyValidator.checkContentSafety(
              `负载测试内容 ${requestCount}`,
            );

            const reqEndTime = Date.now();
            results.push({
              requestId: requestCount,
              duration: reqEndTime - reqStartTime,
              success: true,
              safetyScore: safetyResult.score,
            });
          } catch (error) {
            const reqEndTime = Date.now();
            results.push({
              requestId: requestCount,
              duration: reqEndTime - reqStartTime,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }, interval);
      });

      await testPromise;

      const totalDuration = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const successRate = (successCount / results.length) * 100;

      console.log('📊 持续负载测试结果:', {
        testDuration: `${totalDuration}ms`,
        totalRequests: results.length,
        expectedRequests,
        successCount,
        failureCount,
        successRate: `${successRate.toFixed(2)}%`,
        avgResponseTime: `${Math.round(avgResponseTime)}ms`,
        throughput: `${Math.round(results.length * 1000 / totalDuration)} req/sec`,
      });

      // 性能断言
      expect(successRate).toBeGreaterThan(95); // 成功率应大于95%
      expect(avgResponseTime).toBeLessThan(1000); // 平均响应时间应小于1秒
      expect(results.length).toBeGreaterThan(expectedRequests * 0.8); // 至少完成80%的预期请求
    });
  });

  describe('🎯 性能基准总结', () => {
    it('生成性能报告', async () => {
      console.log('\n📋 Task 2 AI服务性能基准报告');
      console.log('=' .repeat(50));

      // 执行快速基准测试
      const benchmarks = {
        cardGeneration: null as any,
        safetyCheck: null as any,
        qualityEvaluation: null as any,
      };

      // 卡片生成基准
      const cardStartTime = Date.now();
      const card = await cardGenerator.generateCard({
        type: CardType.CONCEPT,
        subject: '基准测试',
        topic: '性能评估',
      });
      benchmarks.cardGeneration = {
        duration: Date.now() - cardStartTime,
        contentLength: card.content.length,
        qualityScore: card.quality.score,
      };

      // 安全检查基准
      const safetyStartTime = Date.now();
      const safetyResult = await contentSafetyValidator.checkContentSafety(card.content);
      benchmarks.safetyCheck = {
        duration: Date.now() - safetyStartTime,
        score: safetyResult.score,
        isSafe: safetyResult.isSafe,
      };

      // 质量评估基准
      const qualityStartTime = Date.now();
      const qualityResult = await contentSafetyValidator.evaluateContentQuality(card.content);
      benchmarks.qualityEvaluation = {
        duration: Date.now() - qualityStartTime,
        overallScore: qualityResult.overall,
      };

      console.log('\n🚀 核心操作性能:');
      console.log(`  卡片生成: ${benchmarks.cardGeneration.duration}ms`);
      console.log(`  安全检查: ${benchmarks.safetyCheck.duration}ms`);
      console.log(`  质量评估: ${benchmarks.qualityEvaluation.duration}ms`);

      console.log('\n📊 质量指标:');
      console.log(`  卡片质量分数: ${benchmarks.cardGeneration.qualityScore}/100`);
      console.log(`  安全检查分数: ${benchmarks.safetyCheck.score}/100`);
      console.log(`  整体质量分数: ${benchmarks.qualityEvaluation.overallScore}/100`);

      console.log('\n⚡ 性能等级评估:');
      const totalTime = benchmarks.cardGeneration.duration + benchmarks.safetyCheck.duration + benchmarks.qualityEvaluation.duration;
      let performanceGrade = 'A';

      if (totalTime > 5000) performanceGrade = 'D';
      else if (totalTime > 3000) performanceGrade = 'C';
      else if (totalTime > 2000) performanceGrade = 'B';

      console.log(`  总处理时间: ${totalTime}ms`);
      console.log(`  性能等级: ${performanceGrade}`);

      const recommendations = [];
      if (benchmarks.cardGeneration.duration > 3000) {
        recommendations.push('优化AI服务调用性能');
      }
      if (benchmarks.safetyCheck.duration > 500) {
        recommendations.push('优化安全检查算法');
      }
      if (benchmarks.qualityEvaluation.duration > 300) {
        recommendations.push('优化质量评估逻辑');
      }

      if (recommendations.length > 0) {
        console.log('\n💡 性能优化建议:');
        recommendations.forEach(rec => console.log(`  - ${rec}`));
      } else {
        console.log('\n✅ 性能表现优秀，无需优化');
      }

      // 性能断言
      expect(performanceGrade).not.toBe('D'); // 性能等级不应该是D
      expect(benchmarks.safetyCheck.isSafe).toBe(true);
      expect(benchmarks.cardGeneration.qualityScore).toBeGreaterThan(60);
    });
  });

  afterAll(() => {
    console.log('\n🏁 Task 2 性能测试完成！');
    console.log('测试覆盖范围:');
    console.log('  ✅ 单次操作性能基准');
    console.log('  ✅ 并发性能测试');
    console.log('  ✅ 混合操作测试');
    console.log('  ✅ 持续负载测试');
    console.log('  ✅ 性能基准报告');
  });
});
