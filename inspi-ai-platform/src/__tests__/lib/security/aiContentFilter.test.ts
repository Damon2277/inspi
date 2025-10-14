/**
 * AI内容过滤器测试
 */

import { geminiService } from '@/core/ai/geminiService';
import { AIContentFilter } from '@/lib/security/aiContentFilter';

// Mock Gemini服务
jest.mock('@/core/ai/geminiService', () => ({
  geminiService: {
    generateContent: jest.fn(),
  },
}));

const mockGeminiService = geminiService as jest.Mocked<typeof geminiService>;

describe('AIContentFilter', () => {
  let filter: AIContentFilter;

  beforeEach(() => {
    filter = new AIContentFilter({ enabled: true, confidenceThreshold: 0.8 });
    jest.clearAllMocks();
  });

  describe('内容检测', () => {
    test('应该检测到不当内容', async () => {
      mockGeminiService.generateContent.mockResolvedValue({
        content: JSON.stringify({
          isAppropriate: false,
          confidence: 0.9,
          categories: ['inappropriate'],
          reasoning: '包含不当言论',
          suggestedAction: 'block',
        }),
        cached: false,
      });

      const issues = await filter.detect('测试不当内容');

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('sensitive_word');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('AI检测到不当内容');
    });

    test('应该通过正常内容', async () => {
      mockGeminiService.generateContent.mockResolvedValue({
        content: JSON.stringify({
          isAppropriate: true,
          confidence: 0.95,
          categories: [],
          reasoning: '内容正常',
          suggestedAction: 'allow',
        }),
        cached: false,
      });

      const issues = await filter.detect('这是正常的教学内容');

      expect(issues).toHaveLength(0);
    });

    test('应该处理低置信度情况', async () => {
      mockGeminiService.generateContent.mockResolvedValue({
        content: JSON.stringify({
          isAppropriate: true,
          confidence: 0.6,
          categories: ['uncertain'],
          reasoning: '不确定',
          suggestedAction: 'review',
        }),
        cached: false,
      });

      const issues = await filter.detect('可能有问题的内容');

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].message).toContain('可疑内容类别');
    });

    test('应该处理AI服务错误', async () => {
      mockGeminiService.generateContent.mockRejectedValue(new Error('AI服务不可用'));

      const issues = await filter.detect('测试内容');

      expect(issues).toHaveLength(0); // 错误时不阻止内容
    });

    test('应该处理无效的AI响应', async () => {
      mockGeminiService.generateContent.mockResolvedValue({
        content: '无效的JSON响应',
        cached: false,
      });

      const issues = await filter.detect('测试内容');

      // 应该降级到基础判断
      expect(issues).toHaveLength(0);
    });
  });

  describe('配置管理', () => {
    test('应该支持启用/禁用', async () => {
      filter.setEnabled(false);

      const issues = await filter.detect('任何内容');

      expect(issues).toHaveLength(0);
      expect(mockGeminiService.generateContent).not.toHaveBeenCalled();
    });

    test('应该支持设置置信度阈值', async () => {
      filter.setConfidenceThreshold(0.5);

      mockGeminiService.generateContent.mockResolvedValue({
        content: JSON.stringify({
          isAppropriate: true,
          confidence: 0.6,
          categories: ['test'],
          reasoning: '测试',
          suggestedAction: 'allow',
        }),
        cached: false,
      });

      const issues = await filter.detect('测试内容');

      expect(issues).toHaveLength(1); // 0.6 > 0.5，应该有警告
    });
  });

  describe('响应解析', () => {
    test('应该正确解析完整的AI响应', async () => {
      const mockResponse = {
        isAppropriate: false,
        confidence: 0.85,
        categories: ['violence', 'inappropriate'],
        reasoning: '包含暴力内容',
        suggestedAction: 'block' as const,
      };

      mockGeminiService.generateContent.mockResolvedValue({
        content: `这是一些前缀文本 ${JSON.stringify(mockResponse)} 这是一些后缀文本`,
        cached: false,
      });

      const issues = await filter.detect('测试内容');

      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('包含暴力内容');
      expect(issues[0].severity).toBe('error');
    });

    test('应该处理部分无效的响应字段', async () => {
      mockGeminiService.generateContent.mockResolvedValue({
        content: JSON.stringify({
          isAppropriate: 'invalid', // 无效类型
          confidence: 1.5, // 超出范围
          categories: 'not-array', // 无效类型
          // 缺少其他字段
        }),
        cached: false,
      });

      const issues = await filter.detect('测试内容');

      expect(issues).toHaveLength(0); // 应该降级处理
    });
  });
});
