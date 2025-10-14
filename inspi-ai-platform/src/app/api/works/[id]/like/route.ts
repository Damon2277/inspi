/**
 * 作品点赞API路由
 */
import { NextRequest, NextResponse } from 'next/server';

import WorkService from '@/core/community/work-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // TODO: 实现用户认证检查
    const userId = 'temp-user-id'; // 临时用户ID

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户未认证' },
        { status: 401 },
      );
    }

    // 切换点赞状态
    const result = await WorkService.toggleLike(id, userId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('点赞操作失败:', error);
    return NextResponse.json(
      { success: false, error: '点赞操作失败' },
      { status: 500 },
    );
  }
}
