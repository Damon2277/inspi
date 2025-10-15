import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/shared/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardId, userId, format, quality } = body;

    if (!cardId || !userId) {
      return NextResponse.json(
        { success: false, error: '缺少必需参数' },
        { status: 400 },
      );
    }

    const exportResult = {
      id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cardId,
      userId,
      format: format || 'png',
      quality: quality || 'standard',
      downloadUrl: `https://example.com/exports/${cardId}.${format || 'png'}`,
      createdAt: new Date(),
    };

    logger.info('Card exported', {
      exportId: exportResult.id,
      cardId,
      userId,
      format: exportResult.format,
      quality: exportResult.quality,
    });

    return NextResponse.json({
      success: true,
      export: exportResult,
      message: '卡片导出成功',
    });
  } catch (error) {
    logger.error('Failed to export card', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '导出卡片失败',
      },
      { status: 500 },
    );
  }
}
