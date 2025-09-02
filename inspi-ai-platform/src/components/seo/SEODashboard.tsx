'use client';

import { useState, useEffect } from 'react';
import { useSEO } from '@/hooks/useSEO';

interface SEOHealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

interface SEOHealthStatus {
  status: 'healthy' | 'warning' | 'error';
  checks: SEOHealthCheck[];
}

interface KeywordRanking {
  [keyword: string]: number;
}

/**
 * SEO仪表板组件
 * 用于监控和管理SEO状态
 */
export default function SEODashboard() {
  const { getSEOHealth, getKeywordRankings } = useSEO();
  const [healthStatus, setHealthStatus] = useState<SEOHealthStatus | null>(null);
  const [keywordRankings, setKeywordRankings] = useState<KeywordRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 默认监控的关键词
  const monitoredKeywords = [
    'AI教学',
    '教学创意',
    '教师工具',
    '教学设计',
    '知识图谱',
    'Inspi.AI'
  ];

  useEffect(() => {
    loadSEOData();
  }, []);

  const loadSEOData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 并行加载健康状态和关键词排名
      const [healthData, rankingsData] = await Promise.all([
        getSEOHealth(),
        getKeywordRankings(monitoredKeywords)
      ]);

      setHealthStatus(healthData);
      setKeywordRankings(rankingsData.keywords);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载SEO数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
      case 'fail':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
      case 'fail':
        return '❌';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="text-red-600 mb-4">
          <h3 className="text-lg font-semibold">SEO数据加载失败</h3>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={loadSEOData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 整体健康状态 */}
      {healthStatus && (
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">SEO健康状态</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(healthStatus.status)}`}>
              {getStatusIcon(healthStatus.status)} {healthStatus.status.toUpperCase()}
            </div>
          </div>

          <div className="space-y-3">
            {healthStatus.checks.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getStatusIcon(check.status)}</span>
                  <div>
                    <div className="font-medium">{check.name}</div>
                    <div className="text-sm text-gray-600">{check.message}</div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(check.status)}`}>
                  {check.status.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 关键词排名 */}
      {keywordRankings && (
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">关键词排名监控</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(keywordRankings).map(([keyword, ranking]) => (
              <div key={keyword} className="p-4 bg-gray-50 rounded">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{keyword}</div>
                  <div className={`px-2 py-1 rounded text-sm font-medium ${
                    ranking <= 10 ? 'text-green-600 bg-green-100' :
                    ranking <= 30 ? 'text-yellow-600 bg-yellow-100' :
                    'text-red-600 bg-red-100'
                  }`}>
                    #{ranking}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        ranking <= 10 ? 'bg-green-500' :
                        ranking <= 30 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(5, 100 - ranking)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex space-x-4">
        <button
          onClick={loadSEOData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          刷新数据
        </button>
        <button
          onClick={() => window.open('/sitemap.xml', '_blank')}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          查看Sitemap
        </button>
        <button
          onClick={() => window.open('/robots.txt', '_blank')}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          查看Robots.txt
        </button>
      </div>
    </div>
  );
}