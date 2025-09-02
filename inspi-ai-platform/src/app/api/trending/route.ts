/**
 * 热门推荐API路由
 * GET /api/trending - 获取热门作品推荐
 */
import { NextRequest, NextResponse } from 'next/server';
import contributionService from '@/lib/services/contributionService';
import { TRENDING_WORKS_CONFIG } from '@/lib/config/contribution';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'weekly';
    const limit = Math.min(
      parseInt(searchParams.get('limit') || TRENDING_WORKS_CONFIG.DEFAULT_LIMIT.toString()),
      TRENDING_WORKS_CONFIG.MAX_LIMIT
    );
    const subject = searchParams.get('subject'); // 学科筛选

    // 验证参数
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json({
        success: false,
        error: '无效的时间周期'
      }, { status: 400 });
    }

    // 获取热门作品
    const trendingWorks = await contributionService.getTrendingWorks(period, limit);

    // 如果指定了学科，进行筛选
    let filteredWorks = trendingWorks.works;
    if (subject) {
      // TODO: 根据作品的学科字段进行筛选
      // filteredWorks = trendingWorks.works.filter(work => work.subject === subject);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...trendingWorks,
        works: filteredWorks
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=1800', // 30分钟缓存
      }
    });

  } catch (error) {
    console.error('获取热门推荐失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取热门推荐失败'
    }, { status: 500 });
  }
}

/**
 * POST /api/trending/refresh - 刷新热门推荐缓存
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: 添加管理员权限验证
    
    // 更新热门作品缓存
    await contributionService.updateTrendingWorksCache();

    return NextResponse.json({
      success: true,
      message: '热门推荐缓存更新成功'
    });

  } catch (error) {
    console.error('更新热门推荐缓存失败:', error);
    return NextResponse.json({
      success: false,
      error: '更新热门推荐缓存失败'
    }, { status: 500 });
  }
}