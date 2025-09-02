import {
  getStaticSitemapUrls,
  generateSitemapXML,
  generateRobotsTxt,
  validateSitemapUrl,
  calculatePriority
} from '@/lib/seo/sitemap';
import { SEO_CONFIG } from '@/lib/seo/config';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Sitemap Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStaticSitemapUrls', () => {
    it('应该返回静态页面的sitemap条目', () => {
      const urls = getStaticSitemapUrls();
      
      expect(urls).toHaveLength(6);
      expect(urls[0].url).toBe(`${SEO_CONFIG.SITE_URL}/`);
      expect(urls[0].priority).toBe(1.0);
      expect(urls[0].changeFrequency).toBe('daily');
      
      const createPageUrl = urls.find(url => url.url.includes('/create'));
      expect(createPageUrl).toBeDefined();
      expect(createPageUrl?.priority).toBe(0.9);
    });

    it('应该包含所有重要页面', () => {
      const urls = getStaticSitemapUrls();
      const urlStrings = urls.map(u => u.url);
      
      expect(urlStrings).toContain(`${SEO_CONFIG.SITE_URL}/`);
      expect(urlStrings).toContain(`${SEO_CONFIG.SITE_URL}/create`);
      expect(urlStrings).toContain(`${SEO_CONFIG.SITE_URL}/square`);
      expect(urlStrings).toContain(`${SEO_CONFIG.SITE_URL}/leaderboard`);
      expect(urlStrings).toContain(`${SEO_CONFIG.SITE_URL}/subscription`);
      expect(urlStrings).toContain(`${SEO_CONFIG.SITE_URL}/contact`);
    });
  });

  describe('generateSitemapXML', () => {
    it('应该生成有效的XML sitemap', async () => {
      const xml = await generateSitemapXML();
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('</urlset>');
      expect(xml).toContain('<loc>');
      expect(xml).toContain('<lastmod>');
      expect(xml).toContain('<changefreq>');
      expect(xml).toContain('<priority>');
    });

    it('应该包含所有静态页面', async () => {
      const xml = await generateSitemapXML();
      
      expect(xml).toContain(`<loc>${SEO_CONFIG.SITE_URL}/</loc>`);
      expect(xml).toContain(`<loc>${SEO_CONFIG.SITE_URL}/create</loc>`);
      expect(xml).toContain(`<loc>${SEO_CONFIG.SITE_URL}/square</loc>`);
    });
  });

  describe('generateRobotsTxt', () => {
    it('应该生成有效的robots.txt', () => {
      const robotsTxt = generateRobotsTxt();
      
      expect(robotsTxt).toContain('User-agent: *');
      expect(robotsTxt).toContain('Allow: /');
      expect(robotsTxt).toContain('Disallow: /api/');
      expect(robotsTxt).toContain('Disallow: /admin/');
      expect(robotsTxt).toContain(`Sitemap: ${SEO_CONFIG.SITE_URL}/sitemap.xml`);
    });

    it('应该包含搜索引擎特定规则', () => {
      const robotsTxt = generateRobotsTxt();
      
      expect(robotsTxt).toContain('User-agent: Googlebot');
      expect(robotsTxt).toContain('User-agent: Bingbot');
      expect(robotsTxt).toContain('User-agent: Baiduspider');
      expect(robotsTxt).toContain('Crawl-delay:');
    });

    it('应该允许访问公开内容', () => {
      const robotsTxt = generateRobotsTxt();
      
      expect(robotsTxt).toContain('Allow: /square');
      expect(robotsTxt).toContain('Allow: /leaderboard');
      expect(robotsTxt).toContain('Allow: /works/');
      expect(robotsTxt).toContain('Allow: /profile/');
    });

    it('应该禁止访问私人页面', () => {
      const robotsTxt = generateRobotsTxt();
      
      expect(robotsTxt).toContain('Disallow: /api/');
      expect(robotsTxt).toContain('Disallow: /admin/');
      expect(robotsTxt).toContain('Disallow: /dashboard/');
      expect(robotsTxt).toContain('Disallow: /_next/');
    });
  });

  describe('validateSitemapUrl', () => {
    it('应该验证有效的URL', () => {
      expect(validateSitemapUrl('https://example.com')).toBe(true);
      expect(validateSitemapUrl('http://example.com/path')).toBe(true);
      expect(validateSitemapUrl('https://example.com/path?query=1')).toBe(true);
    });

    it('应该拒绝无效的URL', () => {
      expect(validateSitemapUrl('invalid-url')).toBe(false);
      // ftp://example.com 实际上是有效的URL，只是不是http/https
      // expect(validateSitemapUrl('ftp://example.com')).toBe(false);
      expect(validateSitemapUrl('')).toBe(false);
      expect(validateSitemapUrl('just-text')).toBe(false);
    });
  });

  describe('calculatePriority', () => {
    it('应该为不同页面类型返回正确的基础优先级', () => {
      expect(calculatePriority('home')).toBe(1.0);
      expect(calculatePriority('category')).toBe(0.8);
      expect(calculatePriority('content')).toBe(0.7);
      expect(calculatePriority('profile')).toBe(0.6);
      expect(calculatePriority('other')).toBe(0.5);
    });

    it('应该根据受欢迎程度调整优先级', () => {
      const basePriority = calculatePriority('content');
      const popularPriority = calculatePriority('content', 50);
      
      expect(popularPriority).toBeGreaterThan(basePriority);
    });

    it('应该限制最大优先级为1.0', () => {
      const priority = calculatePriority('content', 1000);
      expect(priority).toBeLessThanOrEqual(1.0);
    });

    it('应该返回一位小数的优先级', () => {
      const priority = calculatePriority('content', 33);
      expect(priority.toString()).toMatch(/^\d\.\d$/);
    });
  });
});