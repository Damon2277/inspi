/**
 * 作品详情API路由
 */
import { NextRequest, NextResponse } from 'next/server';

import WorkService from '@/core/community/work-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // TODO: 实现用户认证检查
    const userId = 'temp-user-id'; // 临时用户ID

    const result = await WorkService.getWork(id, userId);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 404 });
    }
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    // TODO: 实现用户认证检查
    const userId = 'temp-user-id'; // 临时用户ID

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户未认证' },
        { status: 401 },
      );
    }

    const result = await WorkService.updateWork(id, userId, body);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
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

    // TODO: 实现删除功能
    return NextResponse.json(
      { success: false, error: '删除功能暂未实现' },
      { status: 501 },
    );
  } catch (error) {
    console.error('删除作品失败:', error);
    return NextResponse.json(
      { success: false, error: '删除作品失败' },
      { status: 500 },
    );
  }
}
