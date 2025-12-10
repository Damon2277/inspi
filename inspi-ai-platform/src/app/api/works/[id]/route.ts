/**
 * 作品详情API路由
 */
import { NextRequest, NextResponse } from 'next/server';

import WorkService from '@/core/community/work-service';
import { authenticateToken } from '@/core/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const authResult = await authenticateToken(request);
    const userId = authResult.success ? authResult.user?.userId : undefined;

    const result = await WorkService.getWork(id, userId);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    }

    const statusCode = result.error === '无权限访问此作品' ? 403 : 404;
    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    console.error('获取作品详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取作品详情失败' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const authResult = await authenticateToken(request);

    if (!authResult.success || !authResult.user?.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || '用户未认证' },
        { status: 401 },
      );
    }

    const userId = authResult.user.userId;
    const result = await WorkService.updateWork(id, userId, body);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json(result, { status: 400 });
  } catch (error) {
    console.error('更新作品失败:', error);
    return NextResponse.json(
      { success: false, error: '更新作品失败' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const authResult = await authenticateToken(request);

    if (!authResult.success || !authResult.user?.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || '用户未认证' },
        { status: 401 },
      );
    }

    const userId = authResult.user.userId;
    const result = await WorkService.deleteWork(id, userId);

    if (result.success) {
      return NextResponse.json(
        { success: true, message: result.message || '删除成功' },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { success: false, error: result.error || '删除作品失败' },
      { status: 400 },
    );
  } catch (error) {
    console.error('删除作品失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除作品失败' },
      { status: 500 },
    );
  }
}
