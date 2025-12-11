'use client';

import React from 'react';

import { GeneratedCard } from '@/components/cards/GeneratedCard';
import type { TeachingCard } from '@/shared/types/teaching';


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

  const isSingleCard = cards.length === 1;
  const containerClass = isSingleCard
    ? 'card-flow-two-column card-flow-two-column--single'
    : 'card-flow-two-column';

  return (
    <div className={containerClass}>
      {cards.map(card => (
        <div key={card.id} className="card-flow-two-column__item">
          <GeneratedCard card={card} enableEditing={false} />
        </div>
      ))}
    </div>
  );
}
