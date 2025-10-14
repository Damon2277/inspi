import Head from 'next/head';

import { SEO_CONFIG } from '@/lib/seo/config';
import { SEOData } from '@/lib/seo/utils';

interface SEOHeadProps {
  seoData: SEOData;
  structuredData?: object[];
}

/**
 * SEO Head组件
 * 用于在页面头部插入SEO相关的meta标签和结构化数据
 */
export default function SEOHead({ seoData, structuredData = [] }: SEOHeadProps) {
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
  } = seoData;

  const fullUrl = `${SEO_CONFIG.SITE_URL}${path}`;
  const fullImageUrl = image.startsWith('http') ? image : `${SEO_CONFIG.SITE_URL}${image}`;
  const allKeywords = [...new Set([...keywords, ...tags])];

  return (
    <Head>
      {/* 基本SEO标签 */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords.join(', ')} />
      {author && <meta name="author" content={author} />}

      {/* 规范链接 */}
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph标签 */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={SEO_CONFIG.SITE_NAME} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:locale" content={SEO_CONFIG.OG_LOCALE} />
      <meta property="og:type" content={type} />

      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {section && <meta property="article:section" content={section} />}
      {tags.map(tag => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      {/* Twitter Card标签 */}
      <meta name="twitter:card" content={SEO_CONFIG.TWITTER_CARD} />
      <meta name="twitter:site" content={SEO_CONFIG.TWITTER_SITE} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />

      {/* 其他重要的meta标签 */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

      {/* 移动端优化 */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="format-detection" content="telephone=no" />

      {/* 语言和地区 */}
      <meta httpEquiv="content-language" content="zh-CN" />
      <meta name="geo.region" content="CN" />

      {/* 结构化数据 */}
      {structuredData.map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data, null, 2) }}
        />
      ))}
    </Head>
  );
}
