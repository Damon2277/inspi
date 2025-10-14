import { NextRequest, NextResponse } from 'next/server';

// 模拟订阅数据
const mockSubscriptions: Record<string, any> = {
  'test-user-123': {
    id: 'sub_123456789',
    userId: 'test-user-123',
    planId: 'plan-basic',
    planName: '基础版',
    tier: 'basic',
    status: 'active',
    monthlyPrice: 69,
    currency: 'CNY',
    startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: 'wechat_pay',
    quotas: {
      dailyCreateQuota: 20,
      dailyReuseQuota: 5,
      maxExportsPerDay: 50,
      maxGraphNodes: -1,
    },
    features: ['高清导出', '智能分析', '无限知识图谱'],
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'test-user-456': {
    id: 'sub_987654321',
    userId: 'test-user-456',
    planId: 'plan-pro',
    planName: '专业版',
    tier: 'pro',
    status: 'active',
    monthlyPrice: 199,
    currency: 'CNY',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: 'wechat_pay',
    quotas: {
      dailyCreateQuota: 100,
      dailyReuseQuota: 50,
      maxExportsPerDay: 200,
      maxGraphNodes: -1,
    },
    features: ['高清导出', '智能分析', '无限知识图谱', '品牌定制', '数据导出'],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 },
      );
    }

    // 模拟数据库查询延迟
    await new Promise(resolve => setTimeout(resolve, 200));

    const subscription = mockSubscriptions[userId] || null;

    return NextResponse.json({
      success: true,
      subscription,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error getting current subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
