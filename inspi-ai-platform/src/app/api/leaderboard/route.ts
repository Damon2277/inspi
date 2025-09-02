/**
 * 排行榜API路由
 * GET /api/leaderboard - 获取排行榜数据
 */
import { NextRequest, NextResponse } from 'next/server';
import contributionService from '@/lib/services/contributionService';
import { handleServiceError } from '@/lib/utils/standardErrorHandler';
import { LEADERBOARD_CONFIG } from '@/lib/config/contribution';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const type = searchParams.get('type') || 'total';
    const limit = Math.min(
      parseInt(searchParams.get('limit') || LEADERBOARD_CONFIG.DEFAULT_LIMIT.toString()),
      LEADERBOARD_CONFIG.MAX_LIMIT
    );
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const includeUserRank = searchParams.get('includeUserRank') === 'true';
    const userId = searchParams.get('userId');

    // 验证参数
    if (!['total', 'weekly', 'monthly', 'creation', 'reuse'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: '无效的排行榜类型'
      }, { status: 400 });
    }

    // 获取排行榜数据
    const leaderboard = await contributionService.getLeaderboard({
      type,
      limit,
      offset,
      includeUserRank,
      userId: userId || undefined
    });

    // 获取排行榜统计信息
    const stats = await contributionService.getLeaderboardStats();

    return NextResponse.json({
      success: true,
      data: {
        ...leaderboard,
        stats
      }
    });

  } catch (error) {
    console.error('获取排行榜失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取排行榜失败'
    }, { status: 500 });
  }
}

/**
 * POST /api/leaderboard/refresh - 刷新排行榜缓存（管理员功能）
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: 添加管理员权限验证
    
    // 更新排行榜缓存
    await contributionService.updateLeaderboardCache();

    return NextResponse.json({
      success: true,
      message: '排行榜缓存更新成功'
    });

  } catch (error) {
    console.error('更新排行榜缓存失败:', error);
    return NextResponse.json({
      success: false,
      error: '更新排行榜缓存失败'
    }, { status: 500 });
  }
}