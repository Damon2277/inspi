'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';

import { AuthProviders } from '@/components/auth/AuthProviders';
import { LoginForm } from '@/components/auth/LoginForm';
import { WriteOperation } from '@/core/auth/operation-guard';

interface LoginPromptProps {
  isOpen: boolean;
  onClose: () => void;
  operation: WriteOperation;
  message?: string;
}

export function LoginPrompt({
  isOpen,
  onClose,
  operation,
  message,
}: LoginPromptProps) {
  const [returnPath, setReturnPath] = useState('/');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.body.style.overflow = 'hidden';
    setReturnPath(typeof window !== 'undefined' ? window.location.pathname : '/');

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getOperationIcon = (op: WriteOperation) => {
    const icons = {
      create: '✨',
      edit: '✏️',
      save: '💾',
      reuse: '🔄',
    };
    return icons[op] || '🔒';
  };

  const getOperationTitle = (op: WriteOperation) => {
    const titles = {
      create: '创建专属AI卡片',
      edit: '编辑卡片内容',
      save: '保存您的创作',
      reuse: '复用卡片模板',
    };
    return titles[op] || '使用此功能';
  };

  const getOperationBenefits = (op: WriteOperation) => {
    const benefits = {
      create: [
        '每日3次免费创建额度',
        '四种专业卡片类型',
        '智能内容生成',
        '个人作品管理',
      ],
      edit: [
        '富文本编辑器',
        '实时预览效果',
        '样式自定义',
        '版本历史记录',
      ],
      save: [
        '云端安全存储',
        '多设备同步',
        '永久保存',
        '快速检索',
      ],
      reuse: [
        '每日1次免费复用',
        '快速模板应用',
        '知识积累',
        '效率提升10倍',
      ],
    };
    return benefits[op] || ['解锁更多功能', '提升使用体验'];
  };

  return (
    <div className="login-prompt-overlay" role="dialog" aria-modal="true">
      <div className="login-prompt-backdrop" onClick={onClose} />
      <div className="login-prompt-content" role="document">
        <button
          onClick={onClose}
          className="login-prompt-close"
          aria-label="关闭登录提示"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="login-prompt-body">
          <section className="login-prompt-info">
            <div className="login-prompt-header">
              <div className="login-prompt-icon" aria-hidden="true">
                {getOperationIcon(operation)}
              </div>
              <h3 className="login-prompt-title">{getOperationTitle(operation)}</h3>
              <p className="login-prompt-message">{message || '登录后即可使用此功能'}</p>
            </div>

            <div className="login-prompt-benefits">
              <p className="login-prompt-benefits-title">登录后您将获得：</p>
              <ul className="login-prompt-benefits-list">
                {getOperationBenefits(operation).map((benefit) => (
                  <li key={benefit} className="login-prompt-benefit">
                    <span className="login-prompt-benefit-icon" aria-hidden="true">✔</span>
                    <span className="login-prompt-benefit-text">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="login-prompt-form">
            <AuthProviders>
              <LoginForm redirectTo={returnPath} onSuccess={onClose} />
            </AuthProviders>
          </section>
        </div>

        <div className="login-prompt-footer">
          <p>
            登录即表示您同意我们的{' '}
            <Link href="/terms">用户协议</Link>
            {' '}和{' '}
            <Link href="/privacy">隐私政策</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook for using login prompt
export function useLoginPrompt() {
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    operation: WriteOperation;
    message?: string;
  }>({
    isOpen: false,
    operation: 'create',
  });

  const showPrompt = (operation: WriteOperation, message?: string) => {
    setPromptState({
      isOpen: true,
      operation,
      message,
    });
  };

  const hidePrompt = () => {
    setPromptState({
      ...promptState,
      isOpen: false,
    });
  };

  const LoginPromptComponent = () => (
    <LoginPrompt
      isOpen={promptState.isOpen}
      onClose={hidePrompt}
      operation={promptState.operation}
      message={promptState.message}
    />
  );

  return {
    showPrompt,
    hidePrompt,
    LoginPromptComponent,
    isOpen: promptState.isOpen,
  };
}
