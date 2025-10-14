import { SEO_CONFIG } from './config';
import { updateSitemap } from './sitemap';

/**
 * SEO服务类
 * 负责管理和更新SEO相关功能
 */
export class SEOService {
  private static instance: SEOService;
  private updateQueue: Set<string> = new Set();
  private isUpdating = false;

  private constructor() {}

  public static getInstance(): SEOService {
    if (!SEOService.instance) {
      SEOService.instance = new SEOService();
    }
    return SEOService.instance;
  }

  /**
   * 当新内容发布时调用，更新SEO
   */
  async onContentPublished(contentType: 'work' | 'user', contentId: string): Promise<void> {
    try {
      // 添加到更新队列
      this.updateQueue.add(`${contentType}:${contentId}`);

      // 如果没有正在更新，开始更新流程
      if (!this.isUpdating) {
        await this.processUpdateQueue();
      }
    } catch (error) {
      console.error('Error in onContentPublished:', error);
    }
  }

  /**
   * 处理更新队列
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.isUpdating || this.updateQueue.size === 0) {
      return;
    }

    this.isUpdating = true;

    try {
      // 批量处理更新
      const updates = Array.from(this.updateQueue);
      this.updateQueue.clear();

      // 更新sitemap
      await this.updateSitemapForContent(updates);

      // 清理缓存
      await this.clearSEOCache();

      // 通知搜索引擎
      await this.notifySearchEngines();

      console.log(`SEO updated for ${updates.length} items`);
    } catch (error) {
      console.error('Error processing SEO update queue:', error);
    } finally {
      this.isUpdating = false;

      // 如果队列中还有新的更新，继续处理
      if (this.updateQueue.size > 0) {
        setTimeout(() => this.processUpdateQueue(), 1000);
      }
    }
  }

  /**
   * 为新内容更新sitemap
   */
  private async updateSitemapForContent(updates: string[]): Promise<void> {
    try {
      // 重新生成sitemap
      await updateSitemap();

      console.log('Sitemap updated for new content');
    } catch (error) {
      console.error('Error updating sitemap:', error);
    }
  }

  /**
   * 清理SEO相关缓存
   */
  private async clearSEOCache(): Promise<void> {
    try {
      // 这里可以清理CDN缓存、Redis缓存等
      // 具体实现取决于使用的缓存策略

      // 示例：清理Next.js缓存
      if (typeof window === 'undefined') {
        // 服务端环境
        const { revalidatePath } = await import('next/cache');
        revalidatePath('/sitemap.xml');
        revalidatePath('/robots.txt');
      }
    } catch (error) {
      console.error('Error clearing SEO cache:', error);
    }
  }

  /**
   * 通知搜索引擎更新
   */
  private async notifySearchEngines(): Promise<void> {
    const sitemapUrl = `${SEO_CONFIG.SITE_URL}/sitemap.xml`;

    const searchEngines = [
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    ];

    const notifications = searchEngines.map(async (url) => {
      try {
        const response = await fetch(url, { method: 'GET' });
        if (response.ok) {
          console.log(`Successfully notified search engine: ${url}`);
        } else {
          console.warn(`Failed to notify search engine: ${url}, status: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error notifying search engine ${url}:`, error);
      }
    });

    await Promise.allSettled(notifications);
  }

  /**
   * 生成页面的Open Graph图片
   */
  async generateOGImage(data: {
    title: string;
    description?: string;
    author?: string;
    type?: 'work' | 'profile' | 'general';
  }): Promise<string> {
    try {
      // 这里可以集成图片生成服务，如Puppeteer、Canvas API等
      // 为了演示，返回默认图片
      return SEO_CONFIG.OG_IMAGE;
    } catch (error) {
      console.error('Error generating OG image:', error);
      return SEO_CONFIG.OG_IMAGE;
    }
  }

  /**
   * 分析页面SEO性能
   */
  async analyzeSEOPerformance(url: string): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    try {
      // 这里可以集成SEO分析工具
      // 为了演示，返回模拟数据
      return {
        score: 85,
        issues: [
          '页面加载时间超过3秒',
          '缺少alt属性的图片',
        ],
        suggestions: [
          '优化图片压缩',
          '添加图片alt属性',
          '使用CDN加速',
        ],
      };
    } catch (error) {
      console.error('Error analyzing SEO performance:', error);
      return {
        score: 0,
        issues: ['分析失败'],
        suggestions: [],
      };
    }
  }

  /**
   * 获取关键词排名
   */
  async getKeywordRankings(keywords: string[]): Promise<Map<string, number>> {
    try {
      // 这里可以集成关键词排名查询API
      // 为了演示，返回模拟数据
      const rankings = new Map<string, number>();
      keywords.forEach((keyword, index) => {
        rankings.set(keyword, Math.floor(Math.random() * 100) + 1);
      });
      return rankings;
    } catch (error) {
      console.error('Error getting keyword rankings:', error);
      return new Map();
    }
  }

  /**
   * 监控SEO健康状态
   */
  async monitorSEOHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
    }>;
  }> {
    const checks = [];

    try {
      // 检查sitemap可访问性
      const sitemapResponse = await fetch(`${SEO_CONFIG.SITE_URL}/sitemap.xml`);
      checks.push({
        name: 'Sitemap可访问性',
        status: sitemapResponse.ok ? 'pass' : 'fail',
        message: sitemapResponse.ok ? 'Sitemap正常' : `Sitemap返回${sitemapResponse.status}`,
      });

      // 检查robots.txt
      const robotsResponse = await fetch(`${SEO_CONFIG.SITE_URL}/robots.txt`);
      checks.push({
        name: 'Robots.txt可访问性',
        status: robotsResponse.ok ? 'pass' : 'fail',
        message: robotsResponse.ok ? 'Robots.txt正常' : `Robots.txt返回${robotsResponse.status}`,
      });

      // 检查主页响应时间
      const startTime = Date.now();
      const homeResponse = await fetch(SEO_CONFIG.SITE_URL);
      const responseTime = Date.now() - startTime;

      checks.push({
        name: '主页响应时间',
        status: responseTime < 3000 ? 'pass' : responseTime < 5000 ? 'warning' : 'fail',
        message: `响应时间: ${responseTime}ms`,
      });

      // 计算整体状态
      const failCount = checks.filter(c => c.status === 'fail').length;
      const warningCount = checks.filter(c => c.status === 'warning').length;

      let status: 'healthy' | 'warning' | 'error';
      if (failCount > 0) {
        status = 'error';
      } else if (warningCount > 0) {
        status = 'warning';
      } else {
        status = 'healthy';
      }

      return { status, checks };
    } catch (error) {
      console.error('Error monitoring SEO health:', error);
      return {
        status: 'error',
        checks: [{
          name: 'SEO健康检查',
          status: 'fail',
          message: '检查过程中发生错误',
        }],
      };
    }
  }
}

// 导出单例实例
export const seoService = SEOService.getInstance();
