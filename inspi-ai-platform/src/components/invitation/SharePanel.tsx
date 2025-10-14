/**
 * 分享面板组件
 * 提供完整的邀请分享界面
 */

import React, { useState, useEffect } from 'react';

import { ShareService } from '../../lib/invitation/services/ShareService';
import { SharePlatform } from '../../lib/invitation/types';
import { useShare, getPlatformConfig } from '../../shared/hooks/useShare';

interface SharePanelProps {
  inviteCode: string
  shareService: ShareService
  className?: string
  onShareSuccess?: (platform: SharePlatform) => void
  onShareError?: (platform: SharePlatform, error: string) => void
}

export const SharePanel: React.FC<SharePanelProps> = ({
  inviteCode,
  shareService,
  className = '',
  onShareSuccess,
  onShareError,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  const {
    isSharing,
    shareError,
    shareWithSDK,
    shareWithUrl,
    copyShareUrl,
    isPlatformAvailable,
    getAvailablePlatforms,
    generateQRCode,
    clearError,
  } = useShare(shareService, {
    onShareSuccess: (platform, result) => {
      console.log(`Share success on ${platform}:`, result);
      onShareSuccess && onShareSuccess(platform);
    },
    onShareError: (platform, error) => {
      console.error(`Share error on ${platform}:`, error);
      onShareError && onShareError(platform, error);
    },
  });

  // 生成二维码
  useEffect(() => {
    const loadQRCode = async () => {
      const qrCode = await generateQRCode(inviteCode);
      setQrCodeUrl(qrCode);
    };
    loadQRCode();
  }, [inviteCode, generateQRCode]);

  // 处理平台分享
  const handlePlatformShare = async (platform: SharePlatform) => {
    clearError();

    if (platform === SharePlatform.LINK) {
      await copyShareUrl(inviteCode);
      return;
    }

    // 优先使用SDK分享，如果不可用则使用URL分享
    if (isPlatformAvailable(platform)) {
      await shareWithSDK(inviteCode, platform);
    } else {
      await shareWithUrl(inviteCode, platform);
    }
  };

  // 获取可分享的平台
  const availablePlatforms = getAvailablePlatforms();
  const allPlatforms = Object.values(SharePlatform);

  return (
    <div className={`share-panel ${className}`}>
      <div className="share-panel__header">
        <h3 className="share-panel__title">分享邀请</h3>
        <p className="share-panel__subtitle">
          邀请朋友注册可获得额外奖励
        </p>
      </div>

      {/* 错误提示 */}
      {shareError && (
        <div className="share-panel__error">
          <span className="share-panel__error-icon">⚠️</span>
          <span className="share-panel__error-text">{shareError}</span>
          <button
            className="share-panel__error-close"
            onClick={clearError}
          >
            ✕
          </button>
        </div>
      )}

      {/* 邀请码显示 */}
      <div className="share-panel__invite-code">
        <label className="share-panel__label">邀请码</label>
        <div className="share-panel__code-container">
          <input
            type="text"
            value={inviteCode}
            readOnly
            className="share-panel__code-input"
          />
          <button
            className="share-panel__copy-button"
            onClick={() => copyShareUrl(inviteCode)}
            disabled={isSharing}
          >
            {isSharing ? '复制中...' : '复制链接'}
          </button>
        </div>
      </div>

      {/* 分享平台按钮 */}
      <div className="share-panel__platforms">
        <label className="share-panel__label">选择分享方式</label>
        <div className="share-panel__platform-grid">
          {allPlatforms.map((platform) => {
            const config = getPlatformConfig(platform);
            const isAvailable = availablePlatforms.includes(platform) || platform === SharePlatform.LINK;

            return (
              <button
                key={platform}
                className={`share-panel__platform-button ${
                  isAvailable ? 'share-panel__platform-button--available' : 'share-panel__platform-button--unavailable'
                }`}
                onClick={() => handlePlatformShare(platform)}
                disabled={isSharing || !isAvailable}
                style={{ borderColor: config.color }}
              >
                <span className="share-panel__platform-icon">{config.icon}</span>
                <span className="share-panel__platform-name">{config.name}</span>
                {!isAvailable && (
                  <span className="share-panel__platform-unavailable">不可用</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 二维码分享 */}
      <div className="share-panel__qrcode">
        <button
          className="share-panel__qrcode-toggle"
          onClick={() => setShowQRCode(!showQRCode)}
        >
          <span className="share-panel__qrcode-icon">📱</span>
          <span>显示二维码</span>
          <span className={`share-panel__qrcode-arrow ${showQRCode ? 'share-panel__qrcode-arrow--up' : ''}`}>
            ▼
          </span>
        </button>

        {showQRCode && qrCodeUrl && (
          <div className="share-panel__qrcode-container">
            <img
              src={qrCodeUrl}
              alt="邀请二维码"
              className="share-panel__qrcode-image"
            />
            <p className="share-panel__qrcode-text">
              扫描二维码分享邀请链接
            </p>
          </div>
        )}
      </div>

      {/* 分享提示 */}
      <div className="share-panel__tips">
        <h4 className="share-panel__tips-title">💡 分享提示</h4>
        <ul className="share-panel__tips-list">
          <li>好友通过您的邀请注册，您将获得10次AI生成次数</li>
          <li>好友完成首次创作，您将额外获得5次生成次数</li>
          <li>累计邀请5人注册可获得"社区建设者"称号</li>
        </ul>
      </div>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx>{`
        .share-panel {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
          max-width: 480px;
          margin: 0 auto;
        }

        .share-panel__header {
          text-align: center;
          margin-bottom: 24px;
        }

        .share-panel__title {
          font-size: 20px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 8px 0;
        }

        .share-panel__subtitle {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        .share-panel__error {
          display: flex;
          align-items: center;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
        }

        .share-panel__error-icon {
          margin-right: 8px;
        }

        .share-panel__error-text {
          flex: 1;
          font-size: 14px;
          color: #dc2626;
        }

        .share-panel__error-close {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          padding: 4px;
        }

        .share-panel__invite-code {
          margin-bottom: 24px;
        }

        .share-panel__label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .share-panel__code-container {
          display: flex;
          gap: 8px;
        }

        .share-panel__code-input {
          flex: 1;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 16px;
          font-family: monospace;
          background: #f9fafb;
        }

        .share-panel__copy-button {
          padding: 12px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          white-space: nowrap;
        }

        .share-panel__copy-button:hover {
          background: #2563eb;
        }

        .share-panel__copy-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .share-panel__platforms {
          margin-bottom: 24px;
        }

        .share-panel__platform-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-top: 8px;
        }

        .share-panel__platform-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 8px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .share-panel__platform-button--available:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .share-panel__platform-button--unavailable {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .share-panel__platform-button:disabled {
          cursor: not-allowed;
        }

        .share-panel__platform-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .share-panel__platform-name {
          font-size: 12px;
          font-weight: 500;
          color: #374151;
        }

        .share-panel__platform-unavailable {
          position: absolute;
          top: 4px;
          right: 4px;
          font-size: 10px;
          color: #ef4444;
          background: #fef2f2;
          padding: 2px 4px;
          border-radius: 4px;
        }

        .share-panel__qrcode {
          margin-bottom: 24px;
        }

        .share-panel__qrcode-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 12px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          gap: 8px;
        }

        .share-panel__qrcode-toggle:hover {
          background: #e5e7eb;
        }

        .share-panel__qrcode-arrow {
          transition: transform 0.2s;
        }

        .share-panel__qrcode-arrow--up {
          transform: rotate(180deg);
        }

        .share-panel__qrcode-container {
          text-align: center;
          padding: 16px;
          margin-top: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .share-panel__qrcode-image {
          max-width: 200px;
          height: auto;
          border-radius: 8px;
        }

        .share-panel__qrcode-text {
          margin: 12px 0 0 0;
          font-size: 14px;
          color: #6b7280;
        }

        .share-panel__tips {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 16px;
        }

        .share-panel__tips-title {
          font-size: 14px;
          font-weight: 500;
          color: #0369a1;
          margin: 0 0 8px 0;
        }

        .share-panel__tips-list {
          margin: 0;
          padding-left: 16px;
          font-size: 13px;
          color: #0369a1;
        }

        .share-panel__tips-list li {
          margin-bottom: 4px;
        }

        .share-panel__tips-list li:last-child {
          margin-bottom: 0;
        }

        @media (max-width: 640px) {
          .share-panel {
            padding: 16px;
            margin: 0 16px;
          }

          .share-panel__platform-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .share-panel__code-container {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};
