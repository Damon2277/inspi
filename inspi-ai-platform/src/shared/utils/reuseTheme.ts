import type { TeachingCard } from '@/shared/types/teaching';

interface ReuseThemeParams {
  themeId: number;
  themeTitle: string;
  userId: string;
  cards?: TeachingCard[];
}

interface ReuseThemeResult {
  success: boolean;
  cards?: TeachingCard[];
  error?: string;
}

async function fetchThemeCards(themeId: number, themeTitle: string) {
  const response = await fetch(`/api/square/${themeId}/reuse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ themeTitle }),
  });

  if (!response.ok) {
    throw new Error('获取主题卡片失败');
  }

  const data = await response.json();
  if (!data?.cards || !Array.isArray(data.cards)) {
    throw new Error('主题暂未提供可复用的卡片');
  }

  return data.cards as TeachingCard[];
}

export async function reuseThemeForUser(params: ReuseThemeParams): Promise<ReuseThemeResult> {
  try {
    const cards = params.cards && params.cards.length > 0
      ? params.cards
      : await fetchThemeCards(params.themeId, params.themeTitle);

    if (!cards || cards.length === 0) {
      return { success: false, error: '暂无可复用的卡片' };
    }

    const responses = await Promise.all(
      cards.map((card) => fetch('/api/cards/reuse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          cardId: card.id,
          userId: params.userId,
          metadata: card.metadata ?? {},
          cardType: card.type,
        }),
      })),
    );

    const ok = responses.every(res => res.ok);

    if (!ok) {
      return { success: false, error: '部分卡片复用失败，请稍后再试' };
    }

    return { success: true, cards };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '复用卡片失败',
    };
  }
}
