import { NextResponse } from 'next/server';

import { generateSitemapXML } from '@/lib/seo/sitemap';

export async function GET() {
  try {
    const sitemapXML = await generateSitemapXML();

    return new NextResponse(sitemapXML, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 缓存1小时
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);

    return new NextResponse('Error generating sitemap', {
      status: 500,
    });
  }
}

// 支持HEAD请求
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
