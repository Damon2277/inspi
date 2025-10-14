'use client';

import React from 'react';

interface BackButtonProps {
  className?: string;
  label?: string;
}

export function BackButton({
  className = '',
  label = '返回上一页',
}: BackButtonProps) {
  const handleClick = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
    >
      {label}
    </button>
  );
}
