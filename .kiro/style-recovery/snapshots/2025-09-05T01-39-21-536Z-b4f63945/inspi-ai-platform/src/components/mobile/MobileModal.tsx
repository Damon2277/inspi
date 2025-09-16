'use client';

import React, { useEffect } from 'react';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  fullHeight?: boolean;
}

/**
 * 移动端模态框组件
 */
export function MobileModal({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  fullHeight = false
}: MobileModalProps) {
  useEffect(() => {
    if (isOpen) {
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="mobile-modal" onClick={onClose}>
      <div 
        className={`mobile-modal-content ${fullHeight ? 'max-h-full' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 模态框头部 */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="mobile-subtitle">{title}</h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -mr-2 mobile-touch-feedback"
                aria-label="关闭"
              >
                <svg className="mobile-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 模态框内容 */}
        <div className="mobile-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}