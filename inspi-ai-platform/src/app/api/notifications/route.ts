import { NextRequest, NextResponse } from 'next/server';

import { notificationService } from '@/lib/notification/notification-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 },
      );
    }

    // 解析查询参数
    const options = {
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
      unreadOnly: searchParams.get('unreadOnly') === 'true',
      type: searchParams.get('type') as any,
    };

    // 获取用户通知
    const result = await notificationService.getUserNotifications(userId, options);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('获取通知列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取通知列表失败' },
      { status: 500 },
    );
  }
}
