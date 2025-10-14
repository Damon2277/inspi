'use client';
import React, { useEffect, useState } from 'react';

interface DesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

/**
 * 桌面端模态框组件
 * 优化了桌面端的交互体验
 */
export function DesktopModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: DesktopModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="desktop-modal-overlay" onClick={handleOverlayClick}>
      <div className={`desktop-modal-content ${sizeClasses[size]} ${isAnimating ? 'entered' : 'entering'}`}>
        {title && (
          <div className="desktop-modal-header">
            <h2 className="desktop-modal-title">{title}</h2>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="desktop-modal-body">
          {children}
        </div>
        {footer && (
          <div className="desktop-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 桌面端确认对话框
 */
export function DesktopConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'primary',
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <DesktopModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="desktop-button desktop-button-secondary desktop-button-md"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`desktop-button desktop-button-md ${
              variant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                : 'desktop-button-primary'
            }`}
          >
            {confirmText}
          </button>
        </div>
      }
    >
      <p className="text-gray-600">{message}</p>
    </DesktopModal>
  );
}
