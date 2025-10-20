import { NextRequest, NextResponse } from 'next/server';

import { enrichCard, generateFallbackCard } from '@/app/api/magic/card-engine';
import { mockSquareWorks } from '@/data/mockSquareWorks';
import type { RawCardType } from '@/shared/types/teaching';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const themeId = Number(params.id);

  if (Number.isNaN(themeId)) {
    return NextResponse.json({ success: false, error: '无效的主题编号' }, { status: 400 });
  }

  const theme = mockSquareWorks.find((item) => item.id === themeId);

  if (!theme) {
    return NextResponse.json({ success: false, error: '未找到对应主题' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const themeTitle = typeof body?.themeTitle === 'string' && body.themeTitle.length > 0
    ? body.themeTitle
    : theme.title;

  const cardTypes: RawCardType[] = ['concept', 'example', 'practice', 'extension'];

  const cards = cardTypes.map((cardType, index) => {
    const fallback = generateFallbackCard(cardType, themeTitle);

    return enrichCard(
      {
        ...fallback,
        id: `${themeId}-${cardType}-${index}`,
      },
      themeTitle,
      theme.subject,
      theme.grade,
    );
  });

  return NextResponse.json({
    success: true,
    cards,
  });
}
