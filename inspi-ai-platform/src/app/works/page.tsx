'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/MockAuthProvider';
import { GlassCard, Button } from '@/components/ui';
import Link from 'next/link';

interface Work {
  id: string;
  title: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

type TabType = 'published' | 'drafts' | 'all';

const SUBJECTS = [
  '数学', '语文', '英语', '物理', '化学', '生物', 
  '历史', '地理', '政治', '音乐', '美术', '体育'
];

const GRADE_LEVELS = [
  '小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级',
  '初中一年级', '初中二年级', '初中三年级',
  '高中一年级', '高中二年级', '高中三年级'
];

export default function WorksPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('published');
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    subject: '',
    gradeLevel: '',
    search: ''
  });

  useEffect(() => {
    if (!authLoading) {
      fetchWorks();
    }
  }, [authLoading, activeTab, filters]);

  const fetchWorks = async () => {
    try {
      setLoading(true);
      setError(null);

      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      // 模拟作品数据
      const mockWorks: Work[] = [
        {
          id: '1',
          title: '数学 - 两位数加法',
          knowledgePoint: '两位数加法',
          subject: '数学',
          gradeLevel: '小学二年级',
          status: 'published',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: '语文 - 古诗词鉴赏',
          knowledgePoint: '古诗词鉴赏',
          subject: '语文',
          gradeLevel: '小学三年级',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          title: '英语 - 基础对话',
          knowledgePoint: '日常对话',
          subject: '英语',
          gradeLevel: '小学四年级',
          status: 'published',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];

      // 根据activeTab筛选
      let filteredWorks = mockWorks;
      if (activeTab === 'published') {
        filteredWorks = mockWorks.filter(w => w.status === 'published');
      } else if (activeTab === 'drafts') {
        filteredWorks = mockWorks.filter(w => w.status === 'draft');
      }

      // 根据筛选条件进一步筛选
      if (filters.subject) {
        filteredWorks = filteredWorks.filter(w => w.subject === filters.subject);
      }
      if (filters.gradeLevel) {
        filteredWorks = filteredWorks.filter(w => w.gradeLevel === filters.gradeLevel);
      }
      if (filters.search) {
        filteredWorks = filteredWorks.filter(w => 
          w.title.includes(filters.search) || 
          w.knowledgePoint.includes(filters.search)
        );
      }

      setWorks(filteredWorks);
    } catch (err) {
      setError('获取作品失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workId: string) => {
    if (!confirm('确定要删除这个作品吗？此操作不可恢复。')) {
      return;
    }

    try {
      setWorks(prev => prev.filter(work => work.id !== workId));
    } catch (err) {
      alert('删除失败，请稍后重试');
    }
  };

  const handleStatusChange = (workId: string, newStatus: 'draft' | 'published') => {
    setWorks(prev => prev.map(work => 
      work.id === workId ? { ...work, status: newStatus } : work
    ));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="heading-2 mb-2">加载中...</h2>
          <p className="body-text">正在初始化系统</p>
        </GlassCard>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="text-center py-12 max-w-md mx-auto">
          <h2 className="heading-2 mb-4">需要登录</h2>
          <p className="body-text mb-6">请登录后访问此页面</p>
          <Link href="/">
            <Button variant="primary">返回首页</Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <section className="container section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 fade-in-up">
            <div>
              <h1 className="heading-1 gradient-text mb-2">我的作品</h1>
              <p className="body-text">管理您创建的教学作品</p>
            </div>
            <Link href="/create">
              <Button variant="primary">✨ 创建新作品</Button>
            </Link>
          </div>

          {/* Filters */}
          <GlassCard className="mb-8 fade-in-up stagger-1">
            {/* 标签页 */}
            <div className="flex space-x-1 mb-6">
              {[
                { key: 'published', label: '已发布' },
                { key: 'drafts', label: '草稿' },
                { key: 'all', label: '全部' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 搜索和筛选 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="flex">
                  <input
                    type="text"
                    placeholder="搜索作品标题、知识点..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={fetchWorks}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  >
                    搜索
                  </button>
                </div>
              </div>
              
              <select
                value={filters.subject}
                onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部学科</option>
                {SUBJECTS.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
              
              <select
                value={filters.gradeLevel}
                onChange={(e) => setFilters(prev => ({ ...prev, gradeLevel: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部学段</option>
                {GRADE_LEVELS.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </GlassCard>

          {/* Loading State */}
          {loading && (
            <GlassCard className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="body-text">加载作品中...</p>
            </GlassCard>
          )}

          {/* Error State */}
          {error && (
            <GlassCard className="text-center py-12">
              <div className="text-red-600 mb-4">{error}</div>
              <Button onClick={fetchWorks} variant="primary">重新加载</Button>
            </GlassCard>
          )}

          {/* Works Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {works.length === 0 ? (
                <div className="col-span-full">
                  <GlassCard className="text-center py-12">
                    <h3 className="heading-3 mb-4">
                      {activeTab === 'drafts' ? '还没有草稿' : '暂无作品'}
                    </h3>
                    <p className="body-text mb-6">开始创建您的第一个教学作品吧！</p>
                    <Link href="/create">
                      <Button variant="primary">创建作品</Button>
                    </Link>
                  </GlassCard>
                </div>
              ) : (
                works.map((work, index) => (
                  <GlassCard key={work.id} className={`fade-in-up stagger-${index + 1}`}>
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <h3 className="heading-3">{work.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          work.status === 'published' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {work.status === 'published' ? '已发布' : '草稿'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>知识点:</strong> {work.knowledgePoint}</p>
                        <p><strong>学科:</strong> {work.subject}</p>
                        <p><strong>年级:</strong> {work.gradeLevel}</p>
                        <p><strong>创建时间:</strong> {new Date(work.createdAt).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="flex space-x-2 pt-4 border-t border-gray-200">
                        <Button 
                          variant="secondary" 
                          size="small"
                          onClick={() => window.location.href = `/works/${work.id}`}
                        >
                          查看
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="small"
                          onClick={() => handleStatusChange(
                            work.id, 
                            work.status === 'published' ? 'draft' : 'published'
                          )}
                        >
                          {work.status === 'published' ? '取消发布' : '发布'}
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="small"
                          onClick={() => handleDelete(work.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}