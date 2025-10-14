import { Metadata } from 'next';

import { SEO_CONFIG, PAGE_SEO_CONFIG, DYNAMIC_SEO_TEMPLATES } from './config';

/**
 * SEO工具函数
 */

export interface SEOData {
  title?: string;
  description?: string;
  keywords?: string[];
  path?: string;
  image?: string;
  type?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

/**
 * 生成页面元数据
 */
export function generateMetadata(data: SEOData = {}): Metadata {
  const {
    title = SEO_CONFIG.DEFAULT_TITLE,
    description = SEO_CONFIG.DEFAULT_DESCRIPTION,
    keywords = SEO_CONFIG.DEFAULT_KEYWORDS,
    path = '/',
    image = SEO_CONFIG.OG_IMAGE,
    type = SEO_CONFIG.OG_TYPE,
    publishedTime,
    modifiedTime,
    author,
    section,
    tags = [],
  } = data;

  const fullUrl = `${SEO_CONFIG.SITE_URL}${path}`;
  const fullImageUrl = image.startsWith('http') ? image : `${SEO_CONFIG.SITE_URL}${image}`;

  const allKeywords = [...new Set([...keywords, ...tags])];

  const metadata: Metadata = {
    title,
    description,
    keywords: allKeywords.join(', '),
    authors: author ? [{ name: author }] : [{ name: 'Inspi.AI Team' }],

    // Open Graph
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: SEO_CONFIG.SITE_NAME,
      images: [
        {
          url: fullImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: SEO_CONFIG.OG_LOCALE,
      type: type as any,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(section && { section }),
      ...(tags.length > 0 && { tags }),
    },

    // Twitter Card
    twitter: {
      card: SEO_CONFIG.TWITTER_CARD as any,
      site: SEO_CONFIG.TWITTER_SITE,
      title,
      description,
      images: [fullImageUrl],
    },

    // 其他元数据
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // 规范链接
    alternates: {
      canonical: fullUrl,
    },

    // 其他
    category: section,
  };

  return metadata;
}

/**
 * 生成作品详情页面的SEO数据
 */
export function generateWorkSEO(work: {
  title: string;
  knowledgePoint: string;
  subject: string;
  author: { name: string };
  tags?: string[];
  createdAt: Date;
  updatedAt?: Date;
}): SEOData {
  const template = DYNAMIC_SEO_TEMPLATES.WORK_DETAIL;

  return {
    title: template.titleTemplate(work.title, work.author.name),
    description: template.descriptionTemplate(work.knowledgePoint, work.subject),
    keywords: template.keywordsTemplate(work.knowledgePoint, work.subject, work.tags || []),
    path: `/works/${work.title}`, // 这里应该使用实际的work ID
    type: 'article',
    publishedTime: work.createdAt.toISOString(),
    modifiedTime: work.updatedAt?.toISOString(),
    author: work.author.name,
    section: work.subject,
    tags: work.tags,
  };
}

/**
 * 生成用户档案页面的SEO数据
 */
export function generateUserProfileSEO(user: {
  name: string;
  contributionScore: number;
  workCount: number;
  subjects: string[];
  id: string;
}): SEOData {
  const template = DYNAMIC_SEO_TEMPLATES.USER_PROFILE;

  return {
    title: template.titleTemplate(user.name),
    description: template.descriptionTemplate(user.name, user.contributionScore, user.workCount),
    keywords: template.keywordsTemplate(user.name, user.subjects),
    path: `/profile/${(user.id || (user as any)._id)}`,
    type: 'profile',
  };
}

/**
 * 生成结构化数据 (JSON-LD)
 */
export function generateStructuredData(type: string, data: any): string {
  const baseStructure = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data,
  };

  return JSON.stringify(baseStructure, null, 2);
}

/**
 * 生成网站结构化数据
 */
export function generateWebsiteStructuredData(): string {
  return generateStructuredData('WebSite', {
    name: SEO_CONFIG.SITE_NAME,
    url: SEO_CONFIG.SITE_URL,
    description: SEO_CONFIG.SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SEO_CONFIG.SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    publisher: SEO_CONFIG.ORGANIZATION,
  });
}

/**
 * 生成组织结构化数据
 */
export function generateOrganizationStructuredData(): string {
  return generateStructuredData('Organization', SEO_CONFIG.ORGANIZATION);
}

/**
 * 生成文章结构化数据
 */
export function generateArticleStructuredData(work: {
  title: string;
  description: string;
  author: { name: string };
  publishedAt: Date;
  updatedAt?: Date;
  image?: string;
  url: string;
}): string {
  return generateStructuredData('Article', {
    headline: work.title,
    description: work.description,
    author: {
      '@type': 'Person',
      name: work.author.name,
    },
    publisher: SEO_CONFIG.ORGANIZATION,
    datePublished: work.publishedAt.toISOString(),
    dateModified: work.updatedAt?.toISOString() || work.publishedAt.toISOString(),
    image: work.image ? `${SEO_CONFIG.SITE_URL}${work.image}` : SEO_CONFIG.OG_IMAGE,
    url: work.url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': work.url,
    },
  });
}

/**
 * 生成面包屑导航结构化数据
 */
export function generateBreadcrumbStructuredData(breadcrumbs: Array<{
  name: string;
  url: string;
}>): string {
  const itemListElement = breadcrumbs.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: `${SEO_CONFIG.SITE_URL}${item.url}`,
  }));

  return generateStructuredData('BreadcrumbList', {
    itemListElement,
  });
}

/**
 * 清理和优化文本内容用于SEO
 */
export function optimizeTextForSEO(text: string, maxLength: number = 160): string {
  // 移除HTML标签
  const cleanText = text.replace(/<[^>]*>/g, '');

  // 移除多余的空白字符
  const trimmedText = cleanText.replace(/\s+/g, ' ').trim();

  // 截断到指定长度
  if (trimmedText.length <= maxLength) {
    return trimmedText;
  }

  // 在单词边界截断
  const truncated = trimmedText.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }

  return truncated + '...';
}

/**
 * 生成关键词密度优化的内容
 */
export function optimizeContentKeywords(
  content: string,
  primaryKeywords: string[],
  targetDensity: number = 0.02,
): string {
  // 这是一个简化的关键词密度优化函数
  // 实际应用中可能需要更复杂的NLP处理

  const words = content.split(/\s+/);
  const totalWords = words.length;
  const targetCount = Math.floor(totalWords * targetDensity);

  let optimizedContent = content;

  primaryKeywords.forEach(keyword => {
    const currentCount = (content.match(new RegExp(keyword, 'gi')) || []).length;

    if (currentCount < targetCount) {
      // 在适当位置插入关键词（这里是简化实现）
      const insertions = targetCount - currentCount;
      for (let i = 0; i < insertions; i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        words.splice(randomIndex, 0, keyword);
      }
      optimizedContent = words.join(' ');
    }
  });

  return optimizedContent;
}

/**
 * 验证SEO数据的完整性
 */
export function validateSEOData(data: SEOData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查必需字段
  if (!data.title) {
    errors.push('标题是必需的');
  } else if (data.title.length > 60) {
    warnings.push('标题长度超过60个字符，可能在搜索结果中被截断');
  }

  if (!data.description) {
    errors.push('描述是必需的');
  } else if (data.description.length > 160) {
    warnings.push('描述长度超过160个字符，可能在搜索结果中被截断');
  }

  if (!data.keywords || data.keywords.length === 0) {
    warnings.push('建议添加关键词以提高SEO效果');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
