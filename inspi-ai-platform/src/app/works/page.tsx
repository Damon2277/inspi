'use client';

import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileCard } from '@/components/mobile/MobileCard';
import { MobileButton } from '@/components/mobile/MobileButton';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

/**
 * 移动端我的作品页面
 * 专为移动设备优化的作品管理界面
 */
export default function WorksPage() {
  const [activeTab, setActiveTab] = useState('published');
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'published', label: '已发布', count: 12 },
    { id: 'draft', label: '草稿', count: 3 },
    { id: 'liked', label: '收藏', count: 8 }
  ];

  // 模拟作品数据
  const mockWorks = {
    published: [
      {
        id: 1,
        title: '分数的基本概念与运算',
        subject: '数学',
        grade: '小学',
        status: 'published',
        views: 245,
        likes: 32,
        reuses: 18,
        createdAt: '2024-01-15',
        updatedAt: '2024-01-16',
        thumbnail: '🔢'
      },
      {
        id: 2,
        title: '唐诗宋词鉴赏方法',
        subject: '语文',
        grade: '初中',
        status: 'published',
        views: 189,
        likes: 28,
        reuses: 12,
        createdAt: '2024-01-14',
        updatedAt: '2024-01-14',
        thumbnail: '📖'
      },
      {
        id: 3,
        title: '物理实验：光的折射',
        subject: '物理',
        grade: '高中',
        status: 'published',
        views: 156,
        likes: 24,
        reuses: 9,
        createdAt: '2024-01-13',
        updatedAt: '2024-01-13',
        thumbnail: '🔬'
      }
    ],
    draft: [
      {
        id: 4,
        title: '化学元素周期表记忆法',
        subject: '化学',
        grade: '高中',
        status: 'draft',
        views: 0,
        likes: 0,
        reuses: 0,
        createdAt: '2024-01-16',
        updatedAt: '2024-01-16',
        thumbnail: '⚗️'
      },
      {
        id: 5,
        title: '英语语法：现在完成时',
        subject: '英语',
        grade: '初中',
        status: 'draft',
        views: 0,
        likes: 0,
        reuses: 0,
        createdAt: '2024-01-15',
        updatedAt: '2024-01-16',
        thumbnail: '🔤'
      }
    ],
    liked: [
      {
        id: 6,
        title: '生物细胞结构详解',
        subject: '生物',
        grade: '高中',
        status: 'liked',
        author: '王老师',
        views: 312,
        likes: 45,
        reuses: 23,
        createdAt: '2024-01-12',
        thumbnail: '🧬'
      },
      {
        id: 7,
        title: '历史时间轴记忆技巧',
        subject: '历史',
        grade: '初中',
        status: 'liked',
        author: '李老师',
        views: 278,
        likes: 38,
        reuses: 19,
        createdAt: '2024-01-11',
        thumbnail: '📜'
      }
    ]
  };

  useEffect(() => {
    loadWorks();
  }, [activeTab]);

  const loadWorks = async () => {
    setLoading(true);
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 300));
      setWorks(mockWorks[activeTab] || []);
    } catch (error) {
      console.error('Failed to load works:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (workId) => {
    console.log('Edit work:', workId);
    // 这里可以导航到编辑页面
  };

  const handleDelete = (workId) => {
    if (confirm('确定要删除这个作品吗？')) {
      setWorks(prevWorks => prevWorks.filter(work => work.id !== workId));
    }
  };

  const handlePublish = (workId) => {
    console.log('Publish work:', workId);
    // 这里可以实现发布逻辑
  };

  const handleShare = (workId) => {
    const work = works.find(w => w.id === workId);
    if (work) {
      // 模拟分享功能
      if (navigator.share) {
        navigator.share({
          title: work.title,
          text: `查看这个精彩的教学作品：${work.title}`,
          url: window.location.href
        });
      } else {
        // 降级到复制链接
        navigator.clipboard.writeText(window.location.href);
        alert('链接已复制到剪贴板');
      }
    }
  };

  return (
    <MobileLayout title="我的作品">
      {/* 标签页导航 */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-indigo-200 text-indigo-800'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 统计信息 */}
      {activeTab === 'published' && (
        <div className="px-4 py-4 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-indigo-600">590</div>
              <div className="text-xs text-gray-600">总浏览量</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">84</div>
              <div className="text-xs text-gray-600">总点赞数</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">39</div>
              <div className="text-xs text-gray-600">总复用数</div>
            </div>
          </div>
        </div>
      )}

      {/* 作品列表 */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-500 text-sm">加载中...</p>
          </div>
        ) : works.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-gray-500 text-sm mb-4">
              {activeTab === 'published' && '还没有发布的作品'}
              {activeTab === 'draft' && '还没有草稿'}
              {activeTab === 'liked' && '还没有收藏的作品'}
            </p>
            {activeTab !== 'liked' && (
              <MobileButton
                variant="primary"
                size="sm"
                onClick={() => {
                  // 导航到创作页面
                  console.log('Navigate to create page');
                }}
              >
                开始创作
              </MobileButton>
            )}
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
                  
                  <div className="flex items-center text-xs text-gray-500 mb-2">
                    <span>{work.subject} • {work.grade}</span>
                    {work.author && (
                      <span className="ml-2">• {work.author}</span>
                    )}
                  </div>
                  
                  {/* 统计数据 */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center space-x-1">
                      <span>👁️</span>
                      <span>{work.views}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>👍</span>
                      <span>{work.likes}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>🔄</span>
                      <span>{work.reuses}</span>
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-400 mb-3">
                    创建于 {work.createdAt}
                    {work.updatedAt !== work.createdAt && (
                      <span> • 更新于 {work.updatedAt}</span>
                    )}
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex space-x-2">
                    {activeTab === 'draft' ? (
                      <>
                        <MobileButton
                          variant="primary"
                          size="xs"
                          onClick={() => handleEdit(work.id)}
                        >
                          编辑
                        </MobileButton>
                        <MobileButton
                          variant="outline"
                          size="xs"
                          onClick={() => handlePublish(work.id)}
                        >
                          发布
                        </MobileButton>
                        <MobileButton
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDelete(work.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          删除
                        </MobileButton>
                      </>
                    ) : activeTab === 'published' ? (
                      <>
                        <MobileButton
                          variant="outline"
                          size="xs"
                          onClick={() => handleEdit(work.id)}
                        >
                          编辑
                        </MobileButton>
                        <MobileButton
                          variant="outline"
                          size="xs"
                          onClick={() => handleShare(work.id)}
                        >
                          分享
                        </MobileButton>
                      </>
                    ) : (
                      <MobileButton
                        variant="primary"
                        size="xs"
                        onClick={() => {
                          console.log('View work:', work.id);
                        }}
                      >
                        查看
                      </MobileButton>
                    )}
                  </div>
                </div>
              </div>
            </MobileCard>
          ))
        )}
      </div>

      {/* 浮动创作按钮 */}
      {activeTab !== 'liked' && (
        <div className="fixed bottom-20 right-4 z-10">
          <button
            onClick={() => {
              console.log('Navigate to create page');
            }}
            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          >
            <span className="text-xl">✨</span>
          </button>
        </div>
      )}
    </MobileLayout>
  );
}