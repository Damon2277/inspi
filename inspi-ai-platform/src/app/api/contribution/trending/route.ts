/**
 * 热门作品API
 */

import { NextRequest, NextResponse } from 'next/server';
import contributionService from '@/lib/services/contributionService';

/**
 * 获取热门作品列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const period = (searchParams.get('period') as 'daily' | 'weekly' | 'monthly') || 'weekly';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // 验证时间段参数
    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `无效的时间段。支持的时间段: ${validPeriods.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // 获取热门作品数据
    const trendingWorks = await contributionService.getTrendingWorks(period, limit);

    return NextResponse.json({
      success: true,
      data: trendingWorks
    });

  } catch (error) {
    console.error('获取热门作品失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取热门作品失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 手动刷新热门作品缓存（管理员功能）
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: 添加管理员权限验证
    
    const { period } = await request.json();
    
    if (period && !['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json(
        { success: false, error: '无效的时间段参数' },
        { status: 400 }
      );
    }

    // 刷新指定时间段的热门作品缓存
    if (period) {
      await contributionService.getTrendingWorks(period, 20);
    } else {
      // 刷新所有时间段的缓存
      await Promise.all([
        contributionService.getTrendingWorks('daily', 20),
        contributionService.getTrendingWorks('weekly', 20),
        contributionService.getTrendingWorks('monthly', 20)
      ]);
    }

    return NextResponse.json({
      success: true,
      message: '热门作品缓存刷新成功'
    });

  } catch (error) {
    console.error('刷新热门作品缓存失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '刷新热门作品缓存失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}