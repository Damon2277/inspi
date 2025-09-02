/**
 * 获取用户订阅状态API
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 临时mock数据，避免数据库连接问题
    const mockResponseData = {
      subscription: {
        id: 'mock-subscription-id',
        plan: 'free',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1年后
        autoRenew: false,
        paymentMethod: 'none'
      },
      usage: {
        date: new Date().toISOString().split('T')[0],
        generations: {
          current: 5,
          limit: 10,
          remaining: 5
        },
        reuses: {
          current: 2,
          limit: 5,
          remaining: 3
        }
      },
      plan: 'free'
    };

    return NextResponse.json(mockResponseData);

  } catch (error) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}