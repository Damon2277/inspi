/**
 * 贡献度排行榜API
 */

import { NextRequest, NextResponse } from 'next/server';
import contributionService from '@/lib/services/contributionService';
import { LeaderboardType } from '@/types/contribution';

/**
 * 获取贡献度排行榜
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const type = (searchParams.get('type') as keyof typeof LeaderboardType) || 'total';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const includeUserRank = searchParams.get('includeUserRank') === 'true';
    const userId = searchParams.get('userId');

    // 验证排行榜类型
    const validTypes = Object.values(LeaderboardType);
    if (!validTypes.includes(type as LeaderboardType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `无效的排行榜类型。支持的类型: ${validTypes.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // 获取排行榜数据
    const leaderboard = await contributionService.getLeaderboard({
      type,
      limit,
      offset,
      includeUserRank,
      userId: userId || undefined
    });

    return NextResponse.json({
      success: true,
      data: leaderboard
    });

  } catch (error) {
    console.error('获取排行榜失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取排行榜失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}