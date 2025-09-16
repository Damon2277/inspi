'use client';

import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileCard } from '@/components/mobile/MobileCard';
import { MobileButton } from '@/components/mobile/MobileButton';
import { MobileInput } from '@/components/mobile/MobileInput';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

/**
 * 移动端智慧广场页面
 * 专为移动设备优化的内容浏览界面
 */
export default function SquarePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);

  const subjects = [
    { value: 'all', label: '全部学科' },
    { value: 'math', label: '数学' },
    { value: 'chinese', label: '语文' },
    { value: 'english', label: '英语' },
    { value: 'physics', label: '物理' },
    { value: 'chemistry', label: '化学' },
    { value: 'biology', label: '生物' }
  ];

  const grades = [
    { value: 'all', label: '全部学段' },
    { value: 'primary', label: '小学' },
    { value: 'middle', label: '初中' },
    { value: 'high', label: '高中' }
  ];

  // 模拟作品数据
  const mockWorks = [
    {
      id: 1,
      title: '二次函数的图像与性质',
      author: '张老师',
      subject: '数学',
      grade: '初中',
      description: '通过生动的图像演示，帮助学生理解二次函数的基本性质和变化规律。',
      likes: 128,
      reuses: 45,
      createdAt: '2024-01-15',
      tags: ['函数', '图像', '性质'],
      thumbnail: '📊'
    },
    {
      id: 2,
      title: '古诗词意境赏析',
      author: '李老师',
      subject: '语文',
      grade: '高中',
      description: '深入解析古诗词的意境美，培养学生的文学鉴赏能力。',
      likes: 95,
      reuses: 32,
      createdAt: '2024-01-14',
      tags: ['古诗词', '意境', '赏析'],
      thumbnail: '📜'
    },
    {
      id: 3,
      title: '英语时态综合练习',
      author: '王老师',
      subject: '英语',
      grade: '初中',
      description: '系统梳理英语各种时态的用法，配合丰富的练习题目。',
      likes: 156,
      reuses: 67,
      createdAt: '2024-01-13',
      tags: ['时态', '语法', '练习'],
      thumbnail: '🔤'
    },
    {
      id: 4,
      title: '化学实验安全指南',
      author: '陈老师',
      subject: '化学',
      grade: '高中',
      description: '详细介绍化学实验中的安全注意事项和应急处理方法。',
      likes: 89,
      reuses: 28,
      createdAt: '2024-01-12',
      tags: ['实验', '安全', '化学'],
      thumbnail: '🧪'
    }
  ];

  useEffect(() => {
    loadWorks();
  }, [selectedSubject, selectedGrade, searchQuery]);

  const loadWorks = async () => {
    setLoading(true);
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let filteredWorks = mockWorks;
      
      // 按学科筛选
      if (selectedSubject !== 'all') {
        filteredWorks = filteredWorks.filter(work => 
          work.subject === subjects.find(s => s.value === selectedSubject)?.label
        );
      }
      
      // 按学段筛选
      if (selectedGrade !== 'all') {
        filteredWorks = filteredWorks.filter(work => 
          work.grade === grades.find(g => g.value === selectedGrade)?.label
        );
      }
      
      // 按搜索关键词筛选
      if (searchQuery.trim()) {
        filteredWorks = filteredWorks.filter(work =>
          work.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          work.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          work.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      
      setWorks(filteredWorks);
    } catch (error) {
      console.error('Failed to load works:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = (workId) => {
    setWorks(prevWorks =>
      prevWorks.map(work =>
        work.id === workId
          ? { ...work, likes: work.likes + 1 }
          : work
      )
    );
  };

  const handleReuse = (workId) => {
    const work = works.find(w => w.id === workId);
    if (work) {
      alert(`即将复用作品：${work.title}`);
      setWorks(prevWorks =>
        prevWorks.map(w =>
          w.id === workId
            ? { ...w, reuses: w.reuses + 1 }
            : w
        )
      );
    }
  };

  return (
    <MobileLayout>
      <MobilePageHeader 
        title="智慧广场" 
        subtitle="发现和分享优质教学内容"
      />
      
      {/* 搜索和筛选区域 */}
      <div className="px-4 py-4 bg-white border-b border-gray-200">
        <div className="space-y-3">
          {/* 搜索框 */}
          <MobileInput
            type="search"
            placeholder="搜索作品、知识点..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          
          {/* 筛选器 */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="flex-shrink-0 px-3 py-1.5 text-sm border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {subjects.map((subject) => (
                <option key={subject.value} value={subject.value}>
                  {subject.label}
                </option>
              ))}
            </select>
            
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="flex-shrink-0 px-3 py-1.5 text-sm border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {grades.map((grade) => (
                <option key={grade.value} value={grade.value}>
                  {grade.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 作品列表 */}
      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-500 text-sm">加载中...</p>
          </div>
        ) : works.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">暂无相关作品</p>
          </div>
        ) : (
          works.map((work) => (
            <MobileCard key={work.id} className="p-4">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{work.thumbnail}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                    {work.title}
                  </h3>
                  <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                    {work.description}
                  </p>
                  
                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {work.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  {/* 作者和学科信息 */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{work.author} • {work.subject} • {work.grade}</span>
                    <span>{work.createdAt}</span>
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <span>👍</span>
                        <span>{work.likes}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span>🔄</span>
                        <span>{work.reuses}</span>
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <MobileButton
                        variant="outline"
                        size="xs"
                        onClick={() => handleLike(work.id)}
                      >
                        点赞
                      </MobileButton>
                      <MobileButton
                        variant="primary"
                        size="xs"
                        onClick={() => handleReuse(work.id)}
                      >
                        复用
                      </MobileButton>
                    </div>
                  </div>
                </div>
              </div>
            </MobileCard>
          ))
        )}
      </div>

      {/* 加载更多 */}
      {works.length > 0 && (
        <div className="px-4 pb-6">
          <MobileButton
            variant="outline"
            className="w-full"
            onClick={() => {
              // 这里可以实现加载更多逻辑
              console.log('Load more works');
            }}
          >
            加载更多
          </MobileButton>
        </div>
      )}
    </MobileLayout>
  );
}