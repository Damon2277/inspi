/**
 * 移动端优化的知识点输入组件
 * 专为触摸设备优化的输入体验
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '@/hooks/useResponsive';
import { useVirtualKeyboard } from '@/hooks/useTouch';
import type { GenerateCardsRequest } from '@/types/teaching';

interface MobileKnowledgeInputProps {
  onGenerate: (request: GenerateCardsRequest) => void;
  loading?: boolean;
  placeholder?: string;
  maxLength?: number;
}

const subjects = [
  { value: 'math', label: '数学', icon: '🔢' },
  { value: 'chinese', label: '语文', icon: '📝' },
  { value: 'english', label: '英语', icon: '🔤' },
  { value: 'physics', label: '物理', icon: '⚛️' },
  { value: 'chemistry', label: '化学', icon: '🧪' },
  { value: 'biology', label: '生物', icon: '🧬' },
  { value: 'history', label: '历史', icon: '📚' },
  { value: 'geography', label: '地理', icon: '🌍' },
  { value: 'other', label: '其他', icon: '📖' }
];

const gradeLevels = [
  { value: 'elementary', label: '小学', icon: '🎒' },
  { value: 'middle', label: '初中', icon: '📓' },
  { value: 'high', label: '高中', icon: '🎓' },
  { value: 'university', label: '大学', icon: '🏛️' }
];

const knowledgeSuggestions = [
  "二次函数的图像与性质",
  "光合作用的过程",
  "英语过去时态的用法",
  "中国古代诗词鉴赏",
  "化学元素周期表",
  "几何图形的面积计算",
  "牛顿运动定律",
  "细胞分裂过程",
  "世界地理气候类型",
  "中国近代史重要事件"
];

export default function MobileKnowledgeInput({
  onGenerate,
  loading = false,
  placeholder = "输入您想要教授的知识点...",
  maxLength = 500
}: MobileKnowledgeInputProps) {
  const [knowledgePoint, setKnowledgePoint] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentStep, setCurrentStep] = useState<'knowledge' | 'subject' | 'grade' | 'ready'>('knowledge');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isMobile } = useResponsive();
  const { isKeyboardOpen, keyboardHeight } = useVirtualKeyboard();

  // 自动调整文本框高度
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = isMobile ? 120 : 200;
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [knowledgePoint]);

  // 根据输入状态自动推进步骤
  useEffect(() => {
    if (knowledgePoint.trim() && currentStep === 'knowledge') {
      setCurrentStep('subject');
    } else if (!knowledgePoint.trim() && currentStep !== 'knowledge') {
      setCurrentStep('knowledge');
      setSubject('');
      setGradeLevel('');
    }
  }, [knowledgePoint, currentStep]);

  useEffect(() => {
    if (subject && currentStep === 'subject') {
      setCurrentStep('grade');
    } else if (!subject && currentStep === 'grade') {
      setCurrentStep('subject');
      setGradeLevel('');
    }
  }, [subject, currentStep]);

  useEffect(() => {
    if (gradeLevel && currentStep === 'grade') {
      setCurrentStep('ready');
    } else if (!gradeLevel && currentStep === 'ready') {
      setCurrentStep('grade');
    }
  }, [gradeLevel, currentStep]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setKnowledgePoint(value);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (knowledgePoint.length === 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // 延迟隐藏建议，允许点击建议项
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setKnowledgePoint(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleSubjectSelect = (selectedSubject: string) => {
    setSubject(selectedSubject);
  };

  const handleGradeLevelSelect = (selectedGrade: string) => {
    setGradeLevel(selectedGrade);
  };

  const handleGenerate = () => {
    if (knowledgePoint.trim() && subject && gradeLevel && !loading) {
      onGenerate({
        knowledgePoint: knowledgePoint.trim(),
        subject,
        gradeLevel
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile && currentStep === 'ready') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const canGenerate = knowledgePoint.trim().length > 0 && subject && gradeLevel && !loading;
  const progress = currentStep === 'knowledge' ? 33 : currentStep === 'subject' ? 66 : currentStep === 'grade' ? 90 : 100;

  return (
    <div className="mobile-knowledge-input w-full">
      {/* 主卡片 */}
      <div className={`
        mobile-card transition-all duration-200
        ${isFocused ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        ${isKeyboardOpen && isMobile ? 'mb-4' : ''}
      `}>
        {/* 标题和进度 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className={`font-bold text-gray-900 ${
              isMobile ? 'text-lg' : 'text-xl'
            }`}>
              🪄 AI教学魔法师
            </h2>
            <div className="text-sm text-gray-500">
              {Math.round(progress)}%
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-sm text-gray-600">
            {currentStep === 'knowledge' && '第1步：输入知识点'}
            {currentStep === 'subject' && '第2步：选择学科'}
            {currentStep === 'grade' && '第3步：选择学段'}
            {currentStep === 'ready' && '准备就绪，开始生成！'}
          </p>
        </div>

        {/* 步骤1：知识点输入 */}
        <AnimatePresence mode="wait">
          <motion.div
            key="knowledge-input"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                知识点内容
              </label>
              <textarea
                ref={textareaRef}
                value={knowledgePoint}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                className={`
                  w-full resize-none border-2 rounded-lg transition-all duration-200
                  ${isFocused ? 'border-blue-500' : 'border-gray-200'}
                  ${isMobile ? 'text-base p-4 min-h-[80px]' : 'text-sm p-3 min-h-[60px]'}
                  focus:outline-none focus:ring-0
                  placeholder-gray-400
                `}
                style={{
                  fontSize: isMobile ? '16px' : '14px', // 防止iOS缩放
                  lineHeight: '1.5'
                }}
              />
              
              {/* 字数统计 */}
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {knowledgePoint.length}/{maxLength}
              </div>
            </div>

            {/* 建议按钮 */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center"
              >
                <span className="mr-1">💡</span>
                获取灵感
              </button>
              
              {knowledgePoint.trim() && (
                <div className="text-sm text-green-600 flex items-center">
                  <span className="mr-1">✓</span>
                  知识点已输入
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 步骤2：学科选择 */}
        <AnimatePresence>
          {currentStep !== 'knowledge' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 pt-6 border-t border-gray-200"
            >
              <label className="block text-sm font-medium text-gray-700 mb-3">
                选择学科
              </label>
              <div className="grid grid-cols-3 gap-2">
                {subjects.map((subjectOption) => (
                  <button
                    key={subjectOption.value}
                    onClick={() => handleSubjectSelect(subjectOption.value)}
                    className={`
                      mobile-button text-sm transition-all duration-200
                      ${subject === subjectOption.value
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    <span className="mr-1">{subjectOption.icon}</span>
                    {subjectOption.label}
                  </button>
                ))}
              </div>
              
              {subject && (
                <div className="mt-2 text-sm text-green-600 flex items-center">
                  <span className="mr-1">✓</span>
                  已选择：{subjects.find(s => s.value === subject)?.label}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 步骤3：学段选择 */}
        <AnimatePresence>
          {currentStep === 'grade' || currentStep === 'ready' ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 pt-6 border-t border-gray-200"
            >
              <label className="block text-sm font-medium text-gray-700 mb-3">
                选择学段
              </label>
              <div className="grid grid-cols-2 gap-2">
                {gradeLevels.map((grade) => (
                  <button
                    key={grade.value}
                    onClick={() => handleGradeLevelSelect(grade.value)}
                    className={`
                      mobile-button text-sm transition-all duration-200
                      ${gradeLevel === grade.value
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    <span className="mr-1">{grade.icon}</span>
                    {grade.label}
                  </button>
                ))}
              </div>
              
              {gradeLevel && (
                <div className="mt-2 text-sm text-green-600 flex items-center">
                  <span className="mr-1">✓</span>
                  已选择：{gradeLevels.find(g => g.value === gradeLevel)?.label}
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* 生成按钮 */}
        <AnimatePresence>
          {currentStep === 'ready' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mt-6 pt-6 border-t border-gray-200"
            >
              <motion.button
                onClick={handleGenerate}
                disabled={!canGenerate}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full mobile-button font-medium transition-all duration-200
                  ${canGenerate 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                  ${isMobile ? 'py-4 text-base' : 'py-3 text-sm'}
                `}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>AI正在施展魔法...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>✨</span>
                    <span>生成教学卡片</span>
                  </div>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 建议列表 */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mt-4"
          >
            <div className="mobile-card bg-white border border-gray-200 shadow-lg">
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">
                  💡 知识点建议
                </h3>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {knowledgeSuggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    whileTap={{ scale: 0.98 }}
                    className="
                      w-full text-left p-3 hover:bg-gray-50 transition-colors
                      border-b border-gray-50 last:border-b-0
                      text-sm text-gray-700
                    "
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 移动端键盘适配 */}
      {isMobile && isKeyboardOpen && (
        <div style={{ height: `${Math.max(keyboardHeight - 100, 0)}px` }} />
      )}
    </div>
  );
}