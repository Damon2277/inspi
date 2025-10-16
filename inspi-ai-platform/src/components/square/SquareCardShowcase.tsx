'use client';

import React from 'react';

import type { TeachingCard } from '@/shared/types/teaching';

import { GeneratedCard } from '@/components/cards/GeneratedCard';

interface SquareCardShowcaseProps {
  cards: TeachingCard[];
}

export function SquareCardShowcase({ cards }: SquareCardShowcaseProps) {
  if (!cards || cards.length === 0) {
    return (
      <div
        className="modern-card"
        style={{
          padding: '32px',
          textAlign: 'center',
          color: 'var(--gray-500)',
          fontSize: 'var(--font-size-base)',
        }}
      >
        暂未生成教学卡片。
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: '24px',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        alignItems: 'start',
      }}
    >
      {cards.map(card => (
        <div
          key={card.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <GeneratedCard card={card} enableEditing={false} />
        </div>
      ))}
    </div>
  );
}
