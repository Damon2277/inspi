/**
 * 用户排名API路由
 * GET /api/users/[id]/rank - 获取用户排名信息
 */
import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/core/auth/middleware';
import contributionService from '@/lib/services/contributionService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 验证用户ID格式
    if (!id || id.length !== 24) {
      return NextResponse.json({
        success: false,
        error: '无效的用户ID',
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'total';

    // 验证排行榜类型
    if (!['total', 'weekly', 'monthly'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: '无效的排行榜类型',
      }, { status: 400 });
    }

    // 获取用户在排行榜中的排名
    const userRank = await contributionService.getUserRankInLeaderboard(id, type);

    if (!userRank) {
      return NextResponse.json({
        success: false,
        error: '用户排名信息不存在',
      }, { status: 404 });
    }

    // 获取用户贡献度统计
    const userStats = await contributionService.getUserContributionStats(id);

    return NextResponse.json({
      success: true,
      data: {
        rank: userRank,
        stats: userStats,
      },
    });

  } catch (error) {
    console.error('获取用户排名失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取用户排名失败',
    }, { status: 500 });
  }
}
