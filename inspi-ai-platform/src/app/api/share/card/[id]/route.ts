import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/shared/utils/logger';

/**
 * GET /api/share/card/[id]
 * 获取分享的卡片数据
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 这里应该从数据库获取卡片数据
    // 暂时返回模拟数据，实际应用中需要实现数据库查询

    // 模拟数据库查询延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    // 检查卡片是否存在（这里用简单的ID格式检查）
    if (!id || id.length < 10) {
      return NextResponse.json(
        { error: '卡片不存在' },
        { status: 404 },
      );
    }

    // 返回模拟的卡片数据
    const mockCard = {
      id: id,
      type: 'visualization',
      title: '分享的教学卡片',
      content: '这是一张通过Inspi.AI生成的教学卡片，展示了AI在教育领域的应用潜力。',
      explanation: '使用AI技术生成的个性化教学内容，帮助教学活动提升效果。',
      createdAt: new Date().toISOString(),
      author: '匿名教学创作者',
      shareCount: Math.floor(Math.random() * 100),
      viewCount: Math.floor(Math.random() * 1000),
    };

    return NextResponse.json(mockCard);

  } catch (error) {
    logger.error('Failed to fetch shared card', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/share/card/[id]
 * 记录分享事件
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { platform, action } = body;

    // 记录分享事件到数据库
    // 这里应该实现实际的数据库记录逻辑
    logger.info('Recorded share event', {
      cardId: id,
      platform,
      action,
    });

    // 更新分享统计
    // 实际应用中应该更新数据库中的分享计数

    return NextResponse.json({
      success: true,
      message: '分享事件已记录',
    });

  } catch (error) {
    logger.error('Failed to record share event', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: '记录失败' },
      { status: 500 },
    );
  }
}
