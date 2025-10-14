/**
 * 用户贡献度统计API
 */

import { NextRequest, NextResponse } from 'next/server';

import contributionService from '@/lib/services/contributionService';
import { handleServiceError } from '@/shared/utils/standardErrorHandler';

/**
 * 获取用户贡献度统计
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户ID不能为空' },
        { status: 400 },
      );
    }

    // 获取用户贡献度统计
    const stats = await contributionService.getUserContributionStats(userId);

    // 获取用户排名
    const rankInfo = await contributionService.getUserRank(userId);

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        rank: rankInfo?.rank,
        totalPoints: rankInfo?.totalPoints || stats.totalPoints,
      },
    });

  } catch (error) {
    console.error('获取用户贡献度统计失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取用户贡献度统计失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 },
    );
  }
}
