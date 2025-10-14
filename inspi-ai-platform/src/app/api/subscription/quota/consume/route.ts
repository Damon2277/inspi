import { NextRequest, NextResponse } from 'next/server';

// 模拟配额消费记录
const quotaConsumption: Record<string, Record<string, number>> = {};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, amount = 1, subscriptionId } = body;

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId, type' },
        { status: 400 },
      );
    }

    // 模拟数据库操作延迟
    await new Promise(resolve => setTimeout(resolve, 200));

    // 初始化用户记录
    if (!quotaConsumption[userId]) {
      quotaConsumption[userId] = {};
    }

    // 更新使用量
    const currentUsage = quotaConsumption[userId][type] || 0;
    quotaConsumption[userId][type] = currentUsage + amount;

    // 模拟记录到数据库
    const consumptionRecord = {
      id: `consumption-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      subscriptionId,
      quotaType: type,
      amount,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    };

    console.log('Quota consumed:', consumptionRecord);

    return NextResponse.json({
      success: true,
      consumed: amount,
      totalUsage: quotaConsumption[userId][type],
      record: consumptionRecord,
    });

  } catch (error) {
    console.error('Error consuming quota:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
