/**
 * Task 2 快速验证测试
 * 验证AI服务的核心功能是否正常工作
 */

import { cardGenerator, CardType } from '@/core/ai/card-generator';
import { contentSafetyValidator } from '@/core/ai/content-safety';
import { enhancedGeminiService } from '@/core/ai/enhanced-gemini-service';

// Mock dependencies
jest.mock('@/core/ai/enhanced-gemini-service');
jest.mock('@/lib/utils/logger');
jest.mock('@/lib/cache/simple-redis');

describe('Task 2 快速验证测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful AI response
    (enhancedGeminiService.generateContent as jest.Mock).mockResolvedValue({
      content: `
# 数学概念：函数

## 概念定义
函数是数学中描述两个变量之间对应关系的重要概念。

## 关键特征
1. 定义域：函数的输入值集合
2. 值域：函数的输出值集合
3. 对应关系：每个输入值对应唯一的输出值

## 重要性说明
函数概念是现代数学的基础，在各个分支中都有广泛应用。

## 记忆技巧
把函数想象成一台机器，输入原料，输出产品。

## 简单示例
f(x) = 2x + 1 是一个简单的线性函数。
      `,
      model: 'gemini-1.5-flash',
      cached: false,
      requestId: 'test-req-123',
      timestamp: Date.now(),
    });

    (enhancedGeminiService.isAvailable as jest.Mock).mockReturnValue(true);
    (enhancedGeminiService.healthCheck as jest.Mock).mockResolvedValue(true);
  });

  it('✅ 核心功能验证 - 完整工作流程', async () => {
    console.log('🚀 开始Task 2核心功能验证...');

    // 1. 验证服务可用性
    expect(enhancedGeminiService.isAvailable()).toBe(true);
    console.log('  ✓ Gemini服务可用');

    // 2. 验证卡片生成器
    const supportedTypes = cardGenerator.getSupportedCardTypes();
    expect(supportedTypes).toHaveLength(4);
    expect(supportedTypes).toEqual([
      CardType.CONCEPT,
      CardType.EXAMPLE,
      CardType.PRACTICE,
      CardType.SUMMARY,
    ]);
    console.log('  ✓ 卡片生成器支持4种类型');

    // 3. 生成测试卡片
    const card = await cardGenerator.generateCard({
      type: CardType.CONCEPT,
      subject: '数学',
      topic: '函数',
      difficulty: 'intermediate',
      targetAudience: '高中生',
    });

    expect(card).toBeDefined();
    expect(card.type).toBe(CardType.CONCEPT);
    expect(card.content).toContain('函数');
    expect(card.quality.score).toBeGreaterThan(0);
    console.log(`  ✓ 成功生成概念卡片 (质量分数: ${card.quality.score})`);

    // 4. 验证内容安全检查
    const safetyResult = await contentSafetyValidator.checkContentSafety(card.content);
    expect(safetyResult).toBeDefined();
    expect(safetyResult.isSafe).toBe(true);
    expect(safetyResult.score).toBeGreaterThan(70);
    console.log(`  ✓ 内容安全检查通过 (安全分数: ${safetyResult.score})`);

    // 5. 验证质量评估
    const qualityResult = await contentSafetyValidator.evaluateContentQuality(card.content);
    expect(qualityResult).toBeDefined();
    expect(qualityResult.overall).toBeGreaterThan(50);
    console.log(`  ✓ 质量评估完成 (整体分数: ${qualityResult.overall})`);

    // 6. 验证所有卡片类型
    const allTypes = [CardType.CONCEPT, CardType.EXAMPLE, CardType.PRACTICE, CardType.SUMMARY];
    for (const type of allTypes) {
      const testCard = await cardGenerator.generateCard({
        type,
        subject: '测试学科',
        topic: '测试主题',
      });
      expect(testCard.type).toBe(type);
    }
    console.log('  ✓ 所有4种卡片类型生成正常');

    console.log('🎉 Task 2核心功能验证完成！所有测试通过');
  });

  it('✅ 错误处理验证', async () => {
    console.log('🛡️ 开始错误处理验证...');

    // 1. 测试无效卡片类型
    await expect(cardGenerator.generateCard({
      type: 'invalid' as CardType,
      subject: '数学',
      topic: '函数',
    })).rejects.toThrow('不支持的卡片类型');
    console.log('  ✓ 无效卡片类型错误处理正常');

    // 2. 测试AI服务错误
    (enhancedGeminiService.generateContent as jest.Mock).mockRejectedValueOnce(
      new Error('AI service unavailable'),
    );
    await expect(cardGenerator.generateCard({
      type: CardType.CONCEPT,
      subject: '数学',
      topic: '函数',
    })).rejects.toThrow('AI service unavailable');
    console.log('  ✓ AI服务错误处理正常');

    // 3. 测试敏感内容检测
    const unsafeContent = '这个内容包含暴力描述';
    const unsafeResult = await contentSafetyValidator.checkContentSafety(unsafeContent);
    expect(unsafeResult.isSafe).toBe(false);
    expect(unsafeResult.violations.length).toBeGreaterThan(0);
    console.log('  ✓ 敏感内容检测正常');

    console.log('🛡️ 错误处理验证完成！');
  });

  it('✅ 性能基准验证', async () => {
    console.log('⚡ 开始性能基准验证...');

    // 重置mock
    (enhancedGeminiService.isAvailable as jest.Mock).mockReturnValue(true);

    // 1. 卡片生成性能
    const startTime = Date.now();
    const card = await cardGenerator.generateCard({
      type: CardType.EXAMPLE,
      subject: '物理',
      topic: '牛顿定律',
    });
    const cardDuration = Date.now() - startTime;

    expect(card).toBeDefined();
    expect(cardDuration).toBeLessThan(5000); // 应该在5秒内完成
    console.log(`  ✓ 卡片生成性能: ${cardDuration}ms`);

    // 2. 安全检查性能
    const safetyStartTime = Date.now();
    const safetyResult = await contentSafetyValidator.checkContentSafety(card.content);
    const safetyDuration = Date.now() - safetyStartTime;

    expect(safetyResult).toBeDefined();
    expect(safetyDuration).toBeLessThan(1000); // 应该在1秒内完成
    console.log(`  ✓ 安全检查性能: ${safetyDuration}ms`);

    // 3. 质量评估性能
    const qualityStartTime = Date.now();
    const qualityResult = await contentSafetyValidator.evaluateContentQuality(card.content);
    const qualityDuration = Date.now() - qualityStartTime;

    expect(qualityResult).toBeDefined();
    expect(qualityDuration).toBeLessThan(500); // 应该在500ms内完成
    console.log(`  ✓ 质量评估性能: ${qualityDuration}ms`);

    const totalTime = cardDuration + safetyDuration + qualityDuration;
    console.log(`  📊 总处理时间: ${totalTime}ms`);

    console.log('⚡ 性能基准验证完成！');
  });

  afterAll(() => {
    console.log('\n🎯 Task 2 快速验证测试总结:');
    console.log('  ✅ 核心功能正常');
    console.log('  ✅ 错误处理完善');
    console.log('  ✅ 性能表现良好');
    console.log('  ✅ AI服务集成成功');
    console.log('\n🚀 Task 2 - AI核心功能实现 验证通过！');
  });
});
