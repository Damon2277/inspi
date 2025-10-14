import { NextResponse } from 'next/server';

import { generateRobotsTxt } from '@/lib/seo/sitemap';

export async function GET() {
  try {
    const robotsTxt = generateRobotsTxt();

    return new NextResponse(robotsTxt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // 缓存24小时
      },
    });
  } catch (error) {
    console.error('Error generating robots.txt:', error);

    return new NextResponse('Error generating robots.txt', {
      status: 500,
    });
  }
}
