'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import SubscriptionStatus from '@/components/subscription/SubscriptionStatus';

export default function SubscriptionPage() {
  const [currentPlan, setCurrentPlan] = useState('free');

  // 简化版本，不依赖复杂的认证系统
  const mockUser = {
    id: 'demo-user',
    name: 'Demo User',
    email: 'demo@example.com'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">订阅管理</h1>
              <p className="text-gray-600 mt-1">管理您的订阅计划和使用情况</p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← 返回
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 订阅状态 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SubscriptionStatus />
          </motion.div>

          {/* 订阅计划 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">订阅计划</h2>
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-blue-900">免费版</h3>
                      <p className="text-sm text-blue-700">基础功能，适合个人使用</p>
                    </div>
                    <span className="text-blue-600 font-semibold">当前计划</span>
                  </div>
                  <ul className="mt-3 text-sm text-blue-700 space-y-1">
                    <li>• 每日10次AI生成</li>
                    <li>• 每日5次作品复用</li>
                    <li>• 基础模板库</li>
                  </ul>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">Pro版</h3>
                      <p className="text-sm text-gray-600">更多功能，适合专业用户</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold">¥29</span>
                      <span className="text-sm text-gray-500">/月</span>
                    </div>
                  </div>
                  <ul className="mt-3 text-sm text-gray-600 space-y-1">
                    <li>• 每日50次AI生成</li>
                    <li>• 每日20次作品复用</li>
                    <li>• 高级模板库</li>
                    <li>• 优先客服支持</li>
                  </ul>
                  <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    升级到Pro版
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 使用说明 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 bg-white rounded-lg shadow-sm border p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">使用说明</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">AI生成次数</h3>
              <p className="text-gray-600 text-sm">
                每次使用AI教学魔法师生成教学卡片时会消耗1次生成次数。不同计划有不同的每日限额。
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">作品复用次数</h3>
              <p className="text-gray-600 text-sm">
                在智慧广场复用其他用户的作品时会消耗1次复用次数。复用后的作品可以进行编辑和修改。
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">使用次数重置</h3>
              <p className="text-gray-600 text-sm">
                所有使用次数会在每日凌晨0点自动重置，让您每天都有新的使用额度。
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">订阅管理</h3>
              <p className="text-gray-600 text-sm">
                您可以随时升级订阅计划，升级后立即生效。如需取消订阅，请联系客服。
              </p>
            </div>
          </div>
        </motion.div>

        {/* 联系支持 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 bg-blue-50 rounded-lg p-6 text-center"
        >
          <h3 className="text-lg font-medium text-blue-900 mb-2">需要帮助？</h3>
          <p className="text-blue-700 mb-4">
            如果您在使用过程中遇到任何问题，或需要更多关于订阅计划的信息，请随时联系我们。
          </p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            联系客服
          </button>
        </motion.div>
      </div>
    </div>
  );
}