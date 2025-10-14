'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

import { useResponsive } from '@/shared/hooks/useResponsive';
import { SUBJECTS, GRADE_LEVELS } from '@/shared/types/teaching';
import type { Subject, GradeLevel } from '@/shared/types/teaching';

import { ResponsiveContainer } from '@/shared/components/ResponsiveGrid';

interface KnowledgeInputProps {
  onGenerate: (data: {
    knowledgePoint: string;
    subject: Subject;
    gradeLevel: GradeLevel;
  }) => void;
  loading?: boolean;
}

export default function KnowledgeInput({ onGenerate, loading = false }: KnowledgeInputProps) {
  const { isMobile, isTablet } = useResponsive();
  const [knowledgePoint, setKnowledgePoint] = useState('');
  const [subject, setSubject] = useState<Subject>('数学');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('初中二年级');
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(!isMobile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 验证输入
    if (!knowledgePoint.trim()) {
      setError('请输入知识点');
      return;
    }

    if (knowledgePoint.trim().length > 100) {
      setError('知识点长度不能超过100个字符');
      return;
    }

    setError('');
    onGenerate({
      knowledgePoint: knowledgePoint.trim(),
      subject,
      gradeLevel,
    });
  };

  return (
    <ResponsiveContainer>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mobile-card"
      >
        {/* 头部 */}
        <div className={`mb-6 ${isMobile ? 'text-center' : ''}`}>
          <h2 className={`font-semibold text-gray-900 mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
            ✨ AI教学魔法师
          </h2>
          <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
            输入知识点，AI将为您生成四种类型的创意教学卡片
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 知识点输入 - 移动端优化 */}
          <div>
            <label
              htmlFor="knowledgePoint"
              className={`block font-medium text-gray-700 mb-2 ${isMobile ? 'text-base' : 'text-sm'}`}
            >
              知识点 *
            </label>
            <textarea
              id="knowledgePoint"
              value={knowledgePoint}
              onChange={(e) => setKnowledgePoint(e.target.value)}
              placeholder="例如：二次函数的图像与性质"
              className={`mobile-input w-full resize-none ${isMobile ? 'min-h-[100px]' : ''}`}
              rows={isMobile ? 4 : 3}
              maxLength={100}
              disabled={loading}
              style={{ fontSize: '16px' }} // 防止iOS缩放
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                {knowledgePoint.length}/100 字符
              </span>
              {error && (
                <span className="text-xs text-red-500">{error}</span>
              )}
            </div>
          </div>

          {/* 移动端折叠式高级选项 */}
          {isMobile && (
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg text-left"
              >
                <span className="font-medium text-gray-700">学科和年级设置</span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}

          {/* 学科和年级选择 */}
          {(showAdvanced || !isMobile) && (
            <motion.div
              initial={isMobile ? { opacity: 0, height: 0 } : undefined}
              animate={isMobile ? { opacity: 1, height: 'auto' } : undefined}
              exit={isMobile ? { opacity: 0, height: 0 } : undefined}
              className={`space-y-4 ${isMobile ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}`}
            >
              <div>
                <label
                  htmlFor="subject"
                  className={`block font-medium text-gray-700 mb-2 ${isMobile ? 'text-base' : 'text-sm'}`}
                >
                  学科
                </label>
                <select
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                  className="mobile-input w-full"
                  disabled={loading}
                  style={{ fontSize: '16px' }} // 防止iOS缩放
                >
                  {SUBJECTS.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="gradeLevel"
                  className={`block font-medium text-gray-700 mb-2 ${isMobile ? 'text-base' : 'text-sm'}`}
                >
                  年级
                </label>
                <select
                  id="gradeLevel"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value as GradeLevel)}
                  className="mobile-input w-full"
                  disabled={loading}
                  style={{ fontSize: '16px' }} // 防止iOS缩放
                >
                  {GRADE_LEVELS.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}

          {/* 生成按钮 - 移动端优化 */}
          <div className="flex justify-center pt-4">
            <motion.button
              type="submit"
              disabled={loading || !knowledgePoint.trim()}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className={`mobile-button font-medium transition-colors ${
                isMobile ? 'w-full' : 'px-8'
              } ${
                loading || !knowledgePoint.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
              style={{ minHeight: '48px' }} // 确保触摸友好
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AI正在生成中...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <span className="mr-2">🪄</span>
                  开始生成教学魔法
                </span>
              )}
            </motion.button>
          </div>
        </form>

        {/* 使用提示 - 移动端优化 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className={`font-medium text-blue-900 mb-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
            💡 使用提示
          </h3>
          <ul className={`text-blue-700 space-y-1 ${isMobile ? 'text-sm' : 'text-xs'}`}>
            <li>• 知识点描述越具体，生成的教学卡片越精准</li>
            <li>• AI将生成4种类型：可视化卡、类比延展卡、启发思考卡、互动氛围卡</li>
            {!isMobile && (
              <>
                <li>• 生成后可以编辑每张卡片或要求AI重新生成</li>
                <li>• 满意后可以保存为作品并发布到智慧广场</li>
              </>
            )}
          </ul>
          {isMobile && (
            <div className="mt-2 text-xs text-blue-600">
              点击上方"学科和年级设置"可调整更多选项
            </div>
          )}
        </div>

        {/* 移动端快捷示例 */}
        {isMobile && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">💭 快捷示例</h4>
            <div className="flex flex-wrap gap-2">
              {[
                '二次函数的图像与性质',
                '光的折射现象',
                '古诗词的意境美',
                '细胞分裂过程',
              ].map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setKnowledgePoint(example)}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                  disabled={loading}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </ResponsiveContainer>
  );
}
