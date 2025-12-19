import { NextRequest, NextResponse } from 'next/server';

import { authenticateToken } from '@/core/auth/middleware';
import WorkService from '@/core/community/work-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; cardId: string } },
) {
  try {
    const authResult = await authenticateToken(request);
    if (!authResult.success || !authResult.user?.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || '用户未认证' },
        { status: 401 },
      );
    }

    const body = await request.json();
    if (!body?.visual) {
      return NextResponse.json(
        { success: false, error: '缺少可保存的图示数据' },
        { status: 400 },
      );
    }

    const result = await WorkService.updateCardVisual(
      params.id,
      authResult.user.userId,
      params.cardId,
      {
        visual: body.visual,
        summary: body.summary,
        fallbackReason: body.fallbackReason,
      },
    );

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('保存辅助图示失败:', error);
    return NextResponse.json(
      { success: false, error: '保存辅助图示失败' },
      { status: 500 },
    );
  }
}
