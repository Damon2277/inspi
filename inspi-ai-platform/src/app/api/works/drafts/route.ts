import { NextRequest, NextResponse } from 'next/server';
import workService from '@/lib/services/workService';
import { requireAuth } from '@/lib/auth/middleware';
import { handleAPIError } from '@/lib/utils/errorHandler';

// GET /api/works/drafts - 获取用户草稿列表
export async function GET(request: NextRequest) {
  try {
    // 手动验证认证
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    // TODO: 从token中获取用户ID
    const userId = 'temp-user-id';
    const drafts = await workService.getUserDrafts(userId);

    return NextResponse.json({
      success: true,
      data: drafts
    });
  } catch (error: any) {
    return handleAPIError(error);
  }
}

// POST /api/works/drafts - 自动保存草稿
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
    // TODO: 从token中获取用户ID
    const userId = 'temp-user-id';
    const draft = await workService.saveDraft(userId, body);

    return NextResponse.json({
      success: true,
      data: draft,
      message: '草稿保存成功'
    });
  } catch (error: any) {
    return handleAPIError(error);
  }
}