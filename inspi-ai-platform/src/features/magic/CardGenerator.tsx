'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';

import { useAuthStore } from '@/shared/stores/authStore';
import { CARD_TYPE_CONFIG } from '@/shared/types/teaching';
import type { TeachingCard, GenerateCardsRequest, CardType } from '@/shared/types/teaching';

interface CardGeneratorProps {
  request: GenerateCardsRequest;
  onCardsGenerated: (cards: TeachingCard[]) => void;
  onError: (error: string) => void;
}

export default function CardGenerator({ request, onCardsGenerated, onError }: CardGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const { token } = useAuthStore();
  const selectedCardTypes = useMemo<CardType[]>(() => {
    if (!Array.isArray(request.cardTypes) || request.cardTypes.length === 0) {
      return Object.keys(CARD_TYPE_CONFIG) as CardType[];
    }

    const validTypes = request.cardTypes.filter(
      (type): type is CardType => typeof type === 'string' && type in CARD_TYPE_CONFIG,
    );
    return validTypes.length > 0 ? validTypes : (Object.keys(CARD_TYPE_CONFIG) as CardType[]);
  }, [request.cardTypes]);

  const progressTimeline = useMemo(() => {
    const typeSteps = selectedCardTypes.map((type, index) => ({
      type,
      progress: 40 + Math.round(((index + 1) / selectedCardTypes.length) * 50),
      step: `生成${CARD_TYPE_CONFIG[type].title}...`,
    }));

    const steps = [
      { progress: 20, step: '分析知识点内容...' },
      ...typeSteps.map(({ progress, step }) => ({ progress, step })),
      { progress: 100, step: '完成生成！' },
    ];

    return { steps, typeSteps };
  }, [selectedCardTypes]);

  const generateCards = async () => {
    setLoading(true);
    setProgress(0);
    setCurrentStep('正在连接AI服务...');

    try {
      // 如果没有token，先自动登录测试用户
      let authToken = token;
      if (!authToken) {
        setCurrentStep('正在登录测试账户...');
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'test123',
          }),
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          authToken = loginData.token;
          // 设置cookie以便后续请求使用
          document.cookie = `token=${authToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
        } else {
          throw new Error('自动登录失败');
        }
      }

      // 模拟进度更新
      const payload: GenerateCardsRequest = {
        ...request,
        cardTypes: selectedCardTypes,
      };

      // 发起API请求
      const response = await fetch('/api/magic/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      // 模拟进度更新
      for (const { progress: prog, step } of progressTimeline.steps) {
        setProgress(prog);
        setCurrentStep(step);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成失败');
      }

      const data = await response.json();
      onCardsGenerated(data.cards);

    } catch (error) {
      console.error('Generate cards error:', error);
      onError(error instanceof Error ? error.message : '生成失败，请稍后重试');
    } finally {
      setLoading(false);
      setProgress(0);
      setCurrentStep('');
    }
  };

  // 组件挂载时自动开始生成
  useState(() => {
    generateCards();
  });

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            {/* AI魔法师头像 */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧙‍♂️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">AI教学魔法师正在工作</h3>
              <p className="text-sm text-gray-600 mt-1">为您的知识点施展教学魔法...</p>
            </div>

            {/* 进度条 */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">生成进度</span>
                <span className="text-sm font-medium text-blue-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* 当前步骤 */}
            <div className="text-center">
              <motion.p
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-gray-700"
              >
                {currentStep}
              </motion.p>
            </div>

            {/* 卡片类型预览 */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {selectedCardTypes.map((type, index) => {
                const config = CARD_TYPE_CONFIG[type];
                const threshold = progressTimeline.typeSteps[index]?.progress ?? 0;

                return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0.3, scale: 0.9 }}
                  animate={{
                    opacity: progress >= threshold ? 1 : 0.3,
                    scale: progress >= threshold ? 1 : 0.9,
                  }}
                  className={`p-3 rounded-lg border-2 ${config.color} text-center`}
                >
                  <div className="text-lg mb-1">{config.icon}</div>
                  <div className="text-xs font-medium">{config.title}</div>
                </motion.div>
                );
              })}
            </div>

            {/* 取消按钮 */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setLoading(false);
                  onError('用户取消了生成');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                取消生成
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
