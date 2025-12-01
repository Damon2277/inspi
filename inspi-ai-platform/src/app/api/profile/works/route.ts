import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/core/auth/middleware';
import WorkService from '@/core/community/work-service';

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const userId = request.user?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户未认证' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);

    const result = await WorkService.getUserWorks(userId, {
      status: (statusParam as any) || 'all',
      limit: Number.isNaN(limitParam) ? 50 : limitParam,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || '获取作品失败' },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, works: result.works }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/profile/works error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '服务器错误' },
      { status: 500 },
    );
  }
});
