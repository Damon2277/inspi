import { NextRequest, NextResponse } from 'next/server';
import { seoService } from '@/lib/seo/service';
import { validateSEOData } from '@/lib/seo/utils';

/**
 * SEO分析API
 * 分析页面的SEO性能和提供优化建议
 */
export async function POST(request: NextRequest) {
  try {
    const { url, seoData } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // 分析SEO性能
    const performance = await seoService.analyzeSEOPerformance(url);
    
    // 验证SEO数据（如果提供）
    let validation = null;
    if (seoData) {
      validation = validateSEOData(seoData);
    }

    return NextResponse.json({
      url,
      performance,
      validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in SEO analyze API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 获取关键词排名
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keywordsParam = searchParams.get('keywords');
    
    if (!keywordsParam) {
      return NextResponse.json(
        { error: 'keywords parameter is required' },
        { status: 400 }
      );
    }

    const keywords = keywordsParam.split(',').map(k => k.trim());
    const rankings = await seoService.getKeywordRankings(keywords);
    
    // 转换Map到普通对象
    const rankingsObject = Object.fromEntries(rankings);

    return NextResponse.json({
      keywords: rankingsObject,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting keyword rankings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}