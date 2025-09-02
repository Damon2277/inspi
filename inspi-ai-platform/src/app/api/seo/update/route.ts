import { NextRequest, NextResponse } from 'next/server';
import { seoService } from '@/lib/seo/service';

/**
 * SEO更新API
 * 当有新内容发布时，触发SEO更新
 */
export async function POST(request: NextRequest) {
  try {
    const { contentType, contentId } = await request.json();

    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: 'contentType and contentId are required' },
        { status: 400 }
      );
    }

    if (!['work', 'user'].includes(contentType)) {
      return NextResponse.json(
        { error: 'contentType must be "work" or "user"' },
        { status: 400 }
      );
    }

    // 触发SEO更新
    await seoService.onContentPublished(contentType as 'work' | 'user', contentId);

    return NextResponse.json({
      success: true,
      message: 'SEO update triggered successfully'
    });
  } catch (error) {
    console.error('Error in SEO update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 获取SEO健康状态
 */
export async function GET() {
  try {
    const healthStatus = await seoService.monitorSEOHealth();
    
    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error('Error getting SEO health status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}