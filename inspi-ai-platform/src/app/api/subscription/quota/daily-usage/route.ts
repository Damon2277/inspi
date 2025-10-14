import { NextRequest, NextResponse } from 'next/server';

// 模拟每日使用量数据
const mockDailyUsage: Record<string, Record<string, number>> = {
  'test-user-123': {
    create: 2,
    reuse: 1,
    export: 5,
  },
  'test-user-456': {
    create: 15,
    reuse: 3,
    export: 25,
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const date = searchParams.get('date');

    if (!userId || !type || !date) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId, type, date' },
        { status: 400 },
      );
    }

    // 模拟数据库查询延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    const userUsage = mockDailyUsage[userId] || {};
    const usage = userUsage[type] || 0;

    return NextResponse.json({
      success: true,
      usage,
      date,
      type,
      userId,
    });

  } catch (error) {
    console.error('Error getting daily usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
