'use client';

import React, { useState } from 'react';

import { useLoginPrompt } from '@/components/auth/LoginPrompt';
import { useAuth } from '@/shared/hooks/useAuth';
import { useReuseState } from '@/shared/hooks/useReuseState';
import { reuseThemeForUser } from '@/shared/utils/reuseTheme';

interface SquareQuickReuseButtonProps {
  themeId: number;
  themeTitle: string;
  onReuseSuccess?: () => void;
  onCancelSuccess?: () => void;
}

export function SquareQuickReuseButton({
  themeId,
  themeTitle,
  onReuseSuccess,
  onCancelSuccess,
}: SquareQuickReuseButtonProps) {
  const { isAuthenticated, user } = useAuth();
  const { showPrompt, LoginPromptComponent } = useLoginPrompt();
  const { hasReusedTheme, markThemeReused, unmarkThemeReused } = useReuseState(user?._id);

  const [status, setStatus] = useState<'idle' | 'reusing' | 'cancelling'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  const isReused = hasReusedTheme(themeId);

  const handleReuse = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isReused) return;

    if (!isAuthenticated || !user?._id) {
      showPrompt('reuse', '登录后即可复用教学卡片');
      return;
    }

    setStatus('reusing');
    setFeedback(null);

    const result = await reuseThemeForUser({
      themeId,
      themeTitle,
      userId: user._id,
    });

    if (result.success) {
      markThemeReused(themeId);
      setFeedback('已加入「我的作品」');
      onReuseSuccess?.();
    } else {
      setFeedback(result.error ?? '复用失败，请稍后再试');
    }

    setStatus('idle');
  };

  const handleCancelReuse = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isReused) return;

    if (!isAuthenticated || !user?._id) {
      showPrompt('reuse', '登录后即可管理复用记录');
      return;
    }

    setStatus('cancelling');
    setFeedback(null);

    unmarkThemeReused(themeId);
    setFeedback('已取消复用');
    onCancelSuccess?.();
    setStatus('idle');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
      <LoginPromptComponent />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          className="modern-btn modern-btn-outline modern-btn-sm"
          style={{ whiteSpace: 'nowrap' }}
          onClick={handleReuse}
          disabled={isReused || status === 'reusing'}
        >
          {isReused ? '已复用' : status === 'reusing' ? '复用中...' : '致敬复用'}
        </button>
        {isReused ? (
          <button
            type="button"
            className="modern-btn modern-btn-ghost modern-btn-sm"
            style={{ whiteSpace: 'nowrap' }}
            onClick={handleCancelReuse}
            disabled={status === 'cancelling'}
          >
            {status === 'cancelling' ? '取消中...' : '取消复用'}
          </button>
        ) : null}
      </div>
      {feedback ? (
        <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{feedback}</span>
      ) : null}
    </div>
  );
}
