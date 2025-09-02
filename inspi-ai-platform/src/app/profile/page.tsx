'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useResponsive';
import MobileProfile from '@/components/mobile/MobileProfile';
import MobileKnowledgeGraph from '@/components/mobile/MobileKnowledgeGraph';
import MobileUserStats from '@/components/mobile/MobileUserStats';

// 模拟用户数据类型
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  school?: string;
  subject?: string;
  gradeLevel?: string;
  joinDate: string;
  stats: {
    worksCount: number;
    reuseCount: number;
    contributionScore: number;
    rank: number;
  };
}

// 模拟作品数据
interface UserWork {
  id: string;
  title: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  cardCount: number;
  reuseCount: number;
  createdAt: string;
  status: 'published' | 'draft';
}

// 模拟知识图谱数据
interface KnowledgeNode {
  id: string;
  name: string;
  subject: string;
  level: number;
  worksCount: number;
  x: number;
  y: number;
  connections: string[];
}

export default function ProfilePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  
  // 状态管理
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userWorks, setUserWorks] = useState<UserWork[]>([]);
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'works' | 'graph' | 'stats'>('works');

  // 模拟数据加载
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 模拟用户数据
        const mockUser: UserProfile = {
          id: 'user-1',
          name: '张老师',
          email: 'zhang.teacher@example.com',
          avatar: undefined,
          bio: '小学数学教师，专注于创新教学方法的探索与实践',
          school: '北京市第一小学',
          subject: '数学',
          gradeLevel: '小学',
          joinDate: '2024-01-15',
          stats: {
            worksCount: 12,
            reuseCount: 156,
            contributionScore: 2340,
            rank: 15
          }
        };

        // 模拟用户作品
        const mockWorks: UserWork[] = [
          {
            id: 'work-1',
            title: '分数的认识与理解',
            knowledgePoint: '分数的基本概念',
            subject: '数学',
            gradeLevel: '小学',
            cardCount: 4,
            reuseCount: 23,
            createdAt: '2024-08-25',
            status: 'published'
          },
          {
            id: 'work-2',
            title: '小数的加减运算',
            knowledgePoint: '小数运算规则',
            subject: '数学',
            gradeLevel: '小学',
            cardCount: 3,
            reuseCount: 18,
            createdAt: '2024-08-20',
            status: 'published'
          },
          {
            id: 'work-3',
            title: '几何图形的认识',
            knowledgePoint: '基本几何图形',
            subject: '数学',
            gradeLevel: '小学',
            cardCount: 5,
            reuseCount: 0,
            createdAt: '2024-08-28',
            status: 'draft'
          }
        ];

        // 模拟知识图谱
        const mockGraph: KnowledgeNode[] = [
          {
            id: 'node-1',
            name: '数与代数',
            subject: '数学',
            level: 1,
            worksCount: 8,
            x: 150,
            y: 100,
            connections: ['node-2', 'node-3']
          },
          {
            id: 'node-2',
            name: '分数',
            subject: '数学',
            level: 2,
            worksCount: 3,
            x: 100,
            y: 200,
            connections: ['node-1', 'node-4']
          },
          {
            id: 'node-3',
            name: '小数',
            subject: '数学',
            level: 2,
            worksCount: 2,
            x: 200,
            y: 200,
            connections: ['node-1', 'node-5']
          },
          {
            id: 'node-4',
            name: '分数运算',
            subject: '数学',
            level: 3,
            worksCount: 1,
            x: 50,
            y: 300,
            connections: ['node-2']
          },
          {
            id: 'node-5',
            name: '小数运算',
            subject: '数学',
            level: 3,
            worksCount: 1,
            x: 250,
            y: 300,
            connections: ['node-3']
          }
        ];

        setUser(mockUser);
        setUserWorks(mockWorks);
        setKnowledgeGraph(mockGraph);
      } catch (error) {
        console.error('加载用户数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // 处理作品点击
  const handleWorkClick = (workId: string) => {
    router.push(`/works/${workId}`);
  };

  // 处理作品编辑
  const handleWorkEdit = (workId: string) => {
    router.push(`/create?edit=${workId}`);
  };

  // 处理作品删除
  const handleWorkDelete = async (workId: string) => {
    if (confirm('确定要删除这个作品吗？')) {
      try {
        // 模拟删除API调用
        await new Promise(resolve => setTimeout(resolve, 500));
        setUserWorks(prev => prev.filter(work => work.id !== workId));
      } catch (error) {
        console.error('删除作品失败:', error);
      }
    }
  };

  // 处理知识图谱节点点击
  const handleNodeClick = (nodeId: string) => {
    const node = knowledgeGraph.find(n => n.id === nodeId);
    if (node) {
      console.log('点击节点:', node.name);
      // 可以跳转到相关作品列表
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 用户未登录
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">请先登录</h2>
          <p className="text-gray-600 mb-6">登录后即可查看个人中心</p>
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            去登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile ? (
        // 移动端布局
        <div className="pb-20"> {/* 为底部导航留出空间 */}
          {/* 移动端个人资料 */}
          <MobileProfile
            user={user}
            onEdit={() => router.push('/profile/edit')}
          />

          {/* 移动端标签切换 */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="flex">
              <button
                onClick={() => setActiveTab('works')}
                className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors duration-200 ${
                  activeTab === 'works'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                我的作品
              </button>
              <button
                onClick={() => setActiveTab('graph')}
                className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors duration-200 ${
                  activeTab === 'graph'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                知识图谱
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors duration-200 ${
                  activeTab === 'stats'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                数据统计
              </button>
            </div>
          </div>

          {/* 移动端内容区域 */}
          <div className="px-4 py-4">
            {activeTab === 'works' && (
              <div className="space-y-3">
                {userWorks.map((work) => (
                  <div
                    key={work.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900 line-clamp-1 flex-1">
                        {work.title}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                        work.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {work.status === 'published' ? '已发布' : '草稿'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {work.knowledgePoint}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>{work.subject} • {work.gradeLevel}</span>
                      <span>{work.cardCount}张卡片 • {work.reuseCount}次复用</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {new Date(work.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleWorkEdit(work.id)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"
                          style={{ touchAction: 'manipulation' }}
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleWorkClick(work.id)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
                          style={{ touchAction: 'manipulation' }}
                        >
                          查看
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {userWorks.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">还没有作品</h3>
                    <p className="text-gray-500 text-sm mb-4">创建你的第一个教学作品吧</p>
                    <button
                      onClick={() => router.push('/create')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      style={{ touchAction: 'manipulation' }}
                    >
                      开始创作
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'graph' && (
              <MobileKnowledgeGraph
                nodes={knowledgeGraph}
                onNodeClick={handleNodeClick}
              />
            )}

            {activeTab === 'stats' && (
              <MobileUserStats
                stats={user.stats}
                recentWorks={userWorks.slice(0, 3)}
              />
            )}
          </div>
        </div>
      ) : (
        // 桌面端布局（简化版本）
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">个人中心</h1>
            <p className="text-gray-600">桌面端个人中心功能开发中...</p>
          </div>
        </div>
      )}
    </div>
  );
}