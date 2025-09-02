import { NextRequest, NextResponse } from 'next/server';
import workService from '@/lib/services/workService';
import { requireAuth } from '@/lib/auth/middleware';
import { handleAPIError } from '@/lib/utils/errorHandler';

// POST /api/works/publish - 发布作品
export async function POST(request: NextRequest) {
  try {
    // 手动验证认证
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { workId } = body;

    if (!workId) {
      return NextResponse.json(
        { success: false, message: '缺少作品ID' },
        { status: 400 }
      );
    }

    // TODO: 从token中获取用户ID
    const userId = 'temp-user-id';
    const work = await workService.publishWork(workId, userId);

    return NextResponse.json({
      success: true,
      data: work,
      message: '作品发布成功！'
    });
  } catch (error: any) {
    return handleAPIError(error);
  }
}