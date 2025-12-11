'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';

import { useLoginPrompt } from '@/components/auth/LoginPrompt';
import { useAuth } from '@/shared/hooks/useAuth';
import { useReuseState } from '@/shared/hooks/useReuseState';
import type { TeachingCard } from '@/shared/types/teaching';
import { reuseThemeForUser } from '@/shared/utils/reuseTheme';

interface SquareReuseActionsProps {
  themeId: number;
  themeTitle: string;
  initialReuseCount: number;
  cards?: TeachingCard[];
  allowCancel?: boolean;
  onReuseSuccess?: () => void;
  onCancelSuccess?: () => void;
  hideInlineStat?: boolean;
}

export function SquareReuseActions({
  themeId,
  themeTitle,
  initialReuseCount,
  cards,
  allowCancel = false,
  onReuseSuccess,
  onCancelSuccess,
  hideInlineStat = false,
}: SquareReuseActionsProps) {
  const { isAuthenticated, user } = useAuth();
  const { showPrompt, LoginPromptComponent } = useLoginPrompt();
  const { hasReusedTheme, markThemeReused, unmarkThemeReused } = useReuseState(user?._id);

  const baseReuseCountRef = useRef(initialReuseCount);
  const [actionState, setActionState] = useState<'idle' | 'reusing' | 'cancelling'>('idle');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [hasUserReused, setHasUserReused] = useState(() => hasReusedTheme(themeId));

  useEffect(() => {
    setHasUserReused(hasReusedTheme(themeId));
  }, [hasReusedTheme, themeId]);

  const displayedReuseCount = useMemo(() => {
    return baseReuseCountRef.current + (hasUserReused ? 1 : 0);
  }, [hasUserReused]);

  const buttonLabel = hasUserReused
    ? '已复用'
    : actionState === 'reusing'
      ? '复用中...'
      : '立即复用';

  const handleReuse = async () => {
    if (hasUserReused) return;

    if (!isAuthenticated || !user?._id) {
      showPrompt('reuse', '登录后即可复用教学卡片');
      return;
    }

    setActionState('reusing');
    setFeedback(null);

    try {
      const result = await reuseThemeForUser({
        themeId,
        themeTitle,
        userId: user._id,
        cards,
      });

      if (!result.success) {
        throw new Error(result.error || '复用操作失败');
      }

      markThemeReused(themeId);
      setHasUserReused(true);
      setFeedback({ type: 'success', message: '已复制至「我的作品」，可前往编辑或导出。' });
      onReuseSuccess?.();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : '复用操作失败，请稍后再试。',
      });
    } finally {
      setActionState('idle');
    }
  };

  const handleCancelReuse = async () => {
    if (!hasUserReused) return;
    if (!isAuthenticated || !user?._id) {
      showPrompt('reuse', '登录后即可管理复用记录');
      return;
    }

    setActionState('cancelling');
    setFeedback(null);

    try {
      unmarkThemeReused(themeId);
      setHasUserReused(false);
      setFeedback({ type: 'success', message: '已取消复用，可再次致敬该主题。' });
      onCancelSuccess?.();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : '取消复用失败，请稍后再试。',
      });
    } finally {
      setActionState('idle');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', minWidth: '240px' }}>
      <LoginPromptComponent />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
      >
        {!hideInlineStat && (
          <span style={{
            fontSize: '14px',
            color: 'var(--gray-500)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            已被致敬复用
            <strong style={{ fontSize: '16px', color: 'var(--gray-900)' }}>{displayedReuseCount}</strong>
            次
          </span>
        )}
        <button
          type="button"
          className="modern-btn modern-btn-primary"
          style={{
            whiteSpace: 'nowrap',
            padding: '10px 28px',
            minWidth: '140px',
            justifyContent: 'center',
          }}
          onClick={handleReuse}
          disabled={hasUserReused || actionState === 'reusing'}
        >
          {buttonLabel}
        </button>
        {allowCancel && hasUserReused ? (
          <button
            type="button"
            className="modern-btn modern-btn-ghost"
            style={{
              whiteSpace: 'nowrap',
              padding: '10px 16px',
              minWidth: '110px',
              justifyContent: 'center',
            }}
            onClick={handleCancelReuse}
            disabled={actionState === 'cancelling'}
          >
            {actionState === 'cancelling' ? '取消中...' : '取消复用'}
          </button>
        ) : null}
      </div>
      {feedback ? (
        <div
          role="alert"
          style={{
            fontSize: '13px',
            color: feedback.type === 'success' ? 'var(--success-500)' : 'var(--error-500)',
            background: feedback.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            borderRadius: '8px',
            padding: '6px 10px',
            maxWidth: '320px',
          }}
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}
