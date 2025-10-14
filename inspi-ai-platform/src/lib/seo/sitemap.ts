import { SEO_CONFIG, PAGE_SEO_CONFIG } from './config';

/**
 * Sitemap生成工具
 */

export interface SitemapUrl {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * 生成静态页面的sitemap条目
 */
export function getStaticSitemapUrls(): SitemapUrl[] {
  const baseUrl = SEO_CONFIG.SITE_URL;

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/create`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/square`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/subscription`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}

/**
 * 生成动态作品页面的sitemap条目
 */
export async function getWorksSitemapUrls(): Promise<SitemapUrl[]> {
  try {
    // 这里应该从数据库获取所有已发布的作品
    // 为了演示，我们使用模拟数据
    const works = await getPublishedWorks();

    return works.map(work => ({
      url: `${SEO_CONFIG.SITE_URL}/works/${work.id}`,
      lastModified: work.updatedAt || work.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Error generating works sitemap:', error);
    return [];
  }
}

/**
 * 生成用户档案页面的sitemap条目
 */
export async function getUserProfilesSitemapUrls(): Promise<SitemapUrl[]> {
  try {
    // 这里应该从数据库获取所有公开的用户档案
    const users = await getPublicUserProfiles();

    return users.map(user => ({
      url: `${SEO_CONFIG.SITE_URL}/profile/${(user.id || (user as any)._id)}`,
      lastModified: user.updatedAt || user.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Error generating user profiles sitemap:', error);
    return [];
  }
}

/**
 * 生成学科分类页面的sitemap条目
 */
export function getSubjectSitemapUrls(): SitemapUrl[] {
  const subjects = [
    '数学', '语文', '英语', '物理', '化学', '生物',
    '历史', '地理', '政治', '音乐', '美术', '体育',
  ];

  return subjects.map(subject => ({
    url: `${SEO_CONFIG.SITE_URL}/square?subject=${encodeURIComponent(subject)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));
}

/**
 * 生成完整的sitemap XML
 */
export async function generateSitemapXML(): Promise<string> {
  const staticUrls = getStaticSitemapUrls();
  const worksUrls = await getWorksSitemapUrls();
  const userUrls = await getUserProfilesSitemapUrls();
  const subjectUrls = getSubjectSitemapUrls();

  const allUrls = [...staticUrls, ...worksUrls, ...userUrls, ...subjectUrls];

  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  const urlsetClose = '</urlset>';

  const urlEntries = allUrls.map(entry => {
    const lastmod = entry.lastModified
      ? `<lastmod>${entry.lastModified.toISOString().split('T')[0]}</lastmod>`
      : '';
    const changefreq = entry.changeFrequency
      ? `<changefreq>${entry.changeFrequency}</changefreq>`
      : '';
    const priority = entry.priority
      ? `<priority>${entry.priority}</priority>`
      : '';

    return `  <url>
    <loc>${entry.url}</loc>
    ${lastmod}
    ${changefreq}
    ${priority}
  </url>`;
  }).join('\n');

  return `${xmlHeader}
${urlsetOpen}
${urlEntries}
${urlsetClose}`;
}

/**
 * 生成robots.txt内容
 */
export function generateRobotsTxt(): string {
  const sitemapUrl = `${SEO_CONFIG.SITE_URL}/sitemap.xml`;

  return `User-agent: *
Allow: /

# 允许搜索引擎访问所有公开内容
Allow: /square
Allow: /leaderboard
Allow: /works/
Allow: /profile/

# 禁止访问私人和管理页面
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /_next/
Disallow: /private/

# 禁止访问临时和测试文件
Disallow: /temp/
Disallow: /test/
Disallow: /*.json$
Disallow: /*.xml$

# 特定搜索引擎规则
User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 2

User-agent: Baiduspider
Allow: /
Crawl-delay: 3

# Sitemap位置
Sitemap: ${sitemapUrl}

# 额外的sitemap（如果有分类sitemap）
Sitemap: ${SEO_CONFIG.SITE_URL}/sitemap-works.xml
Sitemap: ${SEO_CONFIG.SITE_URL}/sitemap-users.xml`;
}

// 模拟数据库查询函数（实际应用中应该连接真实数据库）
async function getPublishedWorks(): Promise<Array<{
  id: string;
  title: string;
  createdAt: Date;
  updatedAt?: Date;
}>> {
  // 这里应该是真实的数据库查询
  // 返回所有已发布的作品
  return [];
}

async function getPublicUserProfiles(): Promise<Array<{
  id: string;
  name: string;
  createdAt: Date;
  updatedAt?: Date;
}>> {
  // 这里应该是真实的数据库查询
  // 返回所有公开的用户档案
  return [];
}

/**
 * 更新sitemap（当有新内容发布时调用）
 */
export async function updateSitemap(): Promise<void> {
  try {
    const sitemapXML = await generateSitemapXML();

    // 这里应该将sitemap写入到public目录或CDN
    // 在Next.js中，可以通过API路由来动态生成sitemap
    console.log('Sitemap updated successfully');
  } catch (error) {
    console.error('Error updating sitemap:', error);
    throw error;
  }
}

/**
 * 验证sitemap URL的有效性
 */
export function validateSitemapUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 计算sitemap优先级
 */
export function calculatePriority(
  pageType: 'home' | 'category' | 'content' | 'profile' | 'other',
  popularity?: number,
): number {
  const basePriorities = {
    home: 1.0,
    category: 0.8,
    content: 0.7,
    profile: 0.6,
    other: 0.5,
  };

  let priority = basePriorities[pageType];

  // 根据受欢迎程度调整优先级
  if (popularity && popularity > 0) {
    const popularityBoost = Math.min(popularity / 100, 0.2);
    priority = Math.min(priority + popularityBoost, 1.0);
  }

  return Math.round(priority * 10) / 10; // 保留一位小数
}
