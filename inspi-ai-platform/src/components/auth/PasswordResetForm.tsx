'use client';

import React, { useState } from 'react';

interface PasswordResetFormProps {
  onSuccess?: (email?: string) => void;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

export default function PasswordResetForm({
  onSuccess,
  isLoading: externalIsLoading,
  setIsLoading: externalSetIsLoading,
}: PasswordResetFormProps = {}) {
  const [email, setEmail] = useState('');
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isLoading = externalIsLoading ?? internalIsLoading;
  const setIsLoading = externalSetIsLoading ?? setInternalIsLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // 模拟API调用
    setTimeout(() => {
      setMessage('如果该邮箱存在，我们已发送重置链接到您的邮箱');
      setIsLoading(false);
      onSuccess && onSuccess(email);
    }, 1000);
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            邮箱地址
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="请输入您的邮箱地址"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? '发送中...' : '发送重置链接'}
        </button>

        {message && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}
      </form>
    </div>
  );
}

// 命名导出
export { default as PasswordResetForm } from './PasswordResetForm';
