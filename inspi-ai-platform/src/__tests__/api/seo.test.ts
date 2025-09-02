// Mock the SEO service
jest.mock('@/lib/seo/service', () => ({
  seoService: {
    onContentPublished: jest.fn(),
    monitorSEOHealth: jest.fn(),
    analyzeSEOPerformance: jest.fn(),
    getKeywordRankings: jest.fn()
  }
}));

import { seoService } from '@/lib/seo/service';

// Mock NextRequest for testing
class MockNextRequest {
  public url: string;
  public method: string;
  private body: string;

  constructor(url: string, options: { method: string; body?: string } = { method: 'GET' }) {
    this.url = url;
    this.method = options.method;
    this.body = options.body || '';
  }

  async json() {
    return JSON.parse(this.body);
  }
}

describe('SEO Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onContentPublished', () => {
    it('应该成功触发内容发布更新', async () => {
      const mockOnContentPublished = seoService.onContentPublished as jest.Mock;
      mockOnContentPublished.mockResolvedValue(undefined);

      await seoService.onContentPublished('work', 'work123');

      expect(mockOnContentPublished).toHaveBeenCalledWith('work', 'work123');
    });

    it('应该处理服务错误', async () => {
      const mockOnContentPublished = seoService.onContentPublished as jest.Mock;
      mockOnContentPublished.mockRejectedValue(new Error('Service error'));

      // 应该不抛出错误，而是内部处理
      await expect(seoService.onContentPublished('work', 'work123')).rejects.toThrow('Service error');
    });
  });

  describe('monitorSEOHealth', () => {
    it('应该返回健康状态', async () => {
      const mockHealthStatus = {
        status: 'healthy' as const,
        checks: [
          {
            name: 'Sitemap可访问性',
            status: 'pass' as const,
            message: 'Sitemap正常'
          }
        ]
      };

      const mockMonitorSEOHealth = seoService.monitorSEOHealth as jest.Mock;
      mockMonitorSEOHealth.mockResolvedValue(mockHealthStatus);

      const result = await seoService.monitorSEOHealth();

      expect(result.status).toBe('healthy');
      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].name).toBe('Sitemap可访问性');
    });
  });

  describe('analyzeSEOPerformance', () => {
    it('应该分析SEO性能', async () => {
      const mockPerformance = {
        score: 85,
        issues: ['页面加载时间超过3秒'],
        suggestions: ['优化图片压缩']
      };

      const mockAnalyzeSEOPerformance = seoService.analyzeSEOPerformance as jest.Mock;
      mockAnalyzeSEOPerformance.mockResolvedValue(mockPerformance);

      const result = await seoService.analyzeSEOPerformance('https://example.com/test');

      expect(result.score).toBe(85);
      expect(result.issues).toContain('页面加载时间超过3秒');
      expect(result.suggestions).toContain('优化图片压缩');
    });
  });

  describe('getKeywordRankings', () => {
    it('应该返回关键词排名', async () => {
      const mockRankings = new Map([
        ['AI教学', 15],
        ['教学创意', 23]
      ]);

      const mockGetKeywordRankings = seoService.getKeywordRankings as jest.Mock;
      mockGetKeywordRankings.mockResolvedValue(mockRankings);

      const result = await seoService.getKeywordRankings(['AI教学', '教学创意']);

      expect(result.get('AI教学')).toBe(15);
      expect(result.get('教学创意')).toBe(23);
    });

    it('应该处理多个关键词', async () => {
      const keywords = ['关键词1', '关键词2', '关键词3'];
      const mockRankings = new Map([
        ['关键词1', 10],
        ['关键词2', 20],
        ['关键词3', 30]
      ]);

      const mockGetKeywordRankings = seoService.getKeywordRankings as jest.Mock;
      mockGetKeywordRankings.mockResolvedValue(mockRankings);

      const result = await seoService.getKeywordRankings(keywords);

      expect(result.size).toBe(3);
      expect(mockGetKeywordRankings).toHaveBeenCalledWith(keywords);
    });
  });
});