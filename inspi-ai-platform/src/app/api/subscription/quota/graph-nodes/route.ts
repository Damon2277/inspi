import { NextRequest, NextResponse } from 'next/server';

// 模拟知识图谱节点数据
const mockGraphNodes: Record<string, number> = {
  'test-user-123': 25,
  'test-user-456': 150,
  'test-user-789': 45,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 },
      );
    }

    // 模拟数据库查询延迟
    await new Promise(resolve => setTimeout(resolve, 150));

    const count = mockGraphNodes[userId] || 0;

    return NextResponse.json({
      success: true,
      count,
      userId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error getting graph nodes count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
