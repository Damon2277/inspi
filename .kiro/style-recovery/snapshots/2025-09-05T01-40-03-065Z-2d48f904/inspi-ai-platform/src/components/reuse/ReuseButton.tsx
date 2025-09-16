'use client';

import React, { useState } from 'react';
import { ReusePermissionCheck, ReuseRequest } from '@/types/reuse';
import { useAuth } from '@/lib/auth/context';

export interface ReuseButtonProps {
  workId: string;
  workTitle: string;
  onReuseSuccess?: (newWorkId: string) => void;
  onReuseError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
}

export const ReuseButton: React.FC<ReuseButtonProps> = ({
  workId,
  workTitle,
  onReuseSuccess,
  onReuseError,
  className = '',
  disabled = false,
  size = 'md',
  variant = 'primary'
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [permissionCheck, setPermissionCheck] = useState<ReusePermissionCheck | null>(null);
  const [customTitle, setCustomTitle] = useState('');

  // 样式配置
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500'
  };

  const baseClasses = 'inline-flex items-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200';

  // 检查复用权限
  const checkReusePermission = async () => {
    if (!isAuthenticated) {
      onReuseError?.('请先登录');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/works/${workId}/reuse/check`);
      const result = await response.json();
      
      if (result.success) {
        setPermissionCheck(result.data);
        if (result.data.canReuse) {
          setShowConfirmDialog(true);
        } else {
          onReuseError?.(result.data.reason || '无法复用此作品');
        }
      } else {
        onReuseError?.(result.message || '检查复用权限失败');
      }
    } catch (error) {
      onReuseError?.(error instanceof Error ? error.message : '检查复用权限失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 执行复用
  const handleReuse = async (reuseType: 'full' | 'partial' = 'full') => {
    if (!isAuthenticated) {
      onReuseError?.('请先登录');
      return;
    }

    setIsLoading(true);
    try {
      const reuseRequest: ReuseRequest = {
        workId,
        reuseType,
        targetTitle: customTitle || `${workTitle} (复用版)`
      };

      const response = await fetch(`/api/works/${workId}/reuse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reuseRequest)
      });

      const result = await response.json();
      
      if (result.success) {
        onReuseSuccess?.(result.data.newWorkId);
        setShowConfirmDialog(false);
        setCustomTitle('');
      } else {
        onReuseError?.(result.message || '复用作品失败');
      }
    } catch (error) {
      onReuseError?.(error instanceof Error ? error.message : '复用作品失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 取消复用
  const handleCancel = () => {
    setShowConfirmDialog(false);
    setCustomTitle('');
    setPermissionCheck(null);
  };

  // 如果未登录，显示登录提示
  if (!isAuthenticated) {
    return (
      <button
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses.outline} opacity-50 cursor-not-allowed ${className}`}
        disabled
        title="请先登录"
      >
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        复用
      </button>
    );
  }

  return (
    <>
      {/* 复用按钮 */}
      <button
        onClick={checkReusePermission}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1.5"></div>
            检查中...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            复用
          </>
        )}
      </button>

      {/* 复用确认对话框 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* 对话框头部 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                复用作品
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                将复制《{workTitle}》的内容到您的编辑后台
              </p>
            </div>

            {/* 对话框内容 */}
            <div className="px-6 py-4">
              {/* 权限信息 */}
              {permissionCheck && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-green-800">
                      复用权限检查通过
                    </span>
                  </div>
                  {permissionCheck.quotaUsed !== undefined && (
                    <p className="mt-1 text-xs text-green-700">
                      今日已复用: {permissionCheck.quotaUsed}/{permissionCheck.quotaLimit}
                    </p>
                  )}
                </div>
              )}

              {/* 自定义标题 */}
              <div className="mb-4">
                <label htmlFor="customTitle" className="block text-sm font-medium text-gray-700 mb-2">
                  新作品标题 (可选)
                </label>
                <input
                  id="customTitle"
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={`${workTitle} (复用版)`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* 复用类型选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  复用类型
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="reuseType"
                      value="full"
                      defaultChecked
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      完整复用 - 复制所有内容和卡片
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="reuseType"
                      value="partial"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      部分复用 - 仅复制基础信息
                    </span>
                  </label>
                </div>
              </div>

              {/* 归属说明 */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-blue-800 font-medium">
                      关于归属信息
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      复用后的作品将自动添加归属信息，标明原作品来源，此信息不可删除。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 对话框底部 */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const reuseType = (document.querySelector('input[name="reuseType"]:checked') as HTMLInputElement)?.value as 'full' | 'partial' || 'full';
                  handleReuse(reuseType);
                }}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    复用中...
                  </>
                ) : (
                  '确认复用'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReuseButton;