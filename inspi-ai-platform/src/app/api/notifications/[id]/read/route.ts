import { NextRequest, NextResponse } from 'next/server';

import { notificationService } from '@/lib/notification/notification-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '通知ID不能为空' },
        { status: 400 },
      );
    }

    // 标记通知为已读
    const success = await notificationService.markNotificationAsRead(id);

    if (success) {
      return NextResponse.json({
        success: true,
        message: '通知已标记为已读',
      });
    } else {
      return NextResponse.json(
        { success: false, error: '通知不存在或标记失败' },
        { status: 404 },
      );
    }

  } catch (error) {
    console.error('标记通知已读失败:', error);
    return NextResponse.json(
      { success: false, error: '标记通知已读失败' },
      { status: 500 },
    );
  }
}
