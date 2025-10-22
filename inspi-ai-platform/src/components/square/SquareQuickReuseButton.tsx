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
  reusedLabel?: string;
}

export function SquareQuickReuseButton({
  themeId,
  themeTitle,
  onReuseSuccess,
  onCancelSuccess,
  reusedLabel = '已复用',
}: SquareQuickReuseButtonProps) {
  const { isAuthenticated, user } = useAuth();
  const { showPrompt, LoginPromptComponent } = useLoginPrompt();
  const { hasReusedTheme, markThemeReused, unmarkThemeReused } = useReuseState(user?._id);

  const [status, setStatus] = useState<'idle' | 'reusing' | 'cancelling'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  const isReused = hasReusedTheme(themeId);

  const handleReuse = async () => {
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

  const handleCancelReuse = () => {
    if (!isAuthenticated || !user?._id) {
      showPrompt('reuse', '登录后即可管理复用记录');
      return;
    }

    setStatus('cancelling');
    setFeedback(null);

    unmarkThemeReused(themeId);
    onCancelSuccess?.();
    setStatus('idle');
  };

  const handlePrimaryClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (status !== 'idle') {
      return;
    }

    if (isReused) {
      handleCancelReuse();
    } else {
      void handleReuse();
    }
  };

  const buttonLabel = (() => {
    if (status === 'reusing') return '复用中...';
    if (status === 'cancelling') return '取消中...';
    return isReused ? reusedLabel : '致敬复用';
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
      <LoginPromptComponent />
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="button"
          className={`modern-btn modern-btn-sm ${isReused ? 'modern-btn-success' : 'modern-btn-primary'}`}
          style={{
            whiteSpace: 'nowrap',
            background: isReused ? '#dcfce7' : '#2563eb',
            color: isReused ? '#166534' : 'white',
            border: isReused ? '1px solid #86efac' : 'none',
            fontWeight: '500',
            fontSize: '13px',
            padding: '6px 16px',
            minWidth: '112px',
            transition: 'all 0.2s ease',
            cursor: status === 'idle' ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e) => {
            if (status === 'idle') {
              e.currentTarget.style.transform = 'translateY(-1px)';
              if (!isReused) {
                e.currentTarget.style.background = '#1d4ed8';
              }
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            if (!isReused) {
              e.currentTarget.style.background = '#2563eb';
            }
          }}
          onClick={handlePrimaryClick}
          disabled={status !== 'idle'}
        >
          {buttonLabel}
        </button>
      </div>
      {feedback ? (
        <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{feedback}</span>
      ) : null}
    </div>
  );
}
