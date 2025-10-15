import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/shared/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardId, userId, modifications } = body;

    if (!cardId || !userId) {
      return NextResponse.json(
        { success: false, error: '缺少必需参数' },
        { status: 400 },
      );
    }

    const reusedCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalCardId: cardId,
      userId,
      modifications: modifications || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logger.info('Card reused', {
      newCardId: reusedCard.id,
      originalCardId: cardId,
      userId,
    });

    return NextResponse.json({
      success: true,
      card: reusedCard,
      message: '卡片复用成功',
    });
  } catch (error) {
    logger.error('Failed to reuse card', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '复用卡片失败',
      },
      { status: 500 },
    );
  }
}
