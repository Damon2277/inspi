/**
 * 作品API路由
 * 处理作品的创建和列表查询
 */
import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/core/auth/middleware';
import WorkService from '@/core/community/work-service';

// 创建作品
export const POST = requireAuth(async (request) => {
  try {
    const body = await request.json();
    const userId = request.user?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户未认证' },
        { status: 401 },
      );
    }

    const result = await WorkService.createWork(userId, body);

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Create work API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 },
    );
  }
});

// 获取作品列表（推荐作品）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const userId = searchParams.get('userId'); // 可选，用于个性化推荐

    const result = await WorkService.getRecommendedWorks(userId || undefined, limit);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Get works API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 },
    );
  }
}
