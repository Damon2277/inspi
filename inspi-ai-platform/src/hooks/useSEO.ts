import { useCallback } from 'react';
import { SEOData, generateMetadata } from '@/lib/seo/utils';

/**
 * SEO相关的自定义Hook
 */
export function useSEO() {
  /**
   * 触发SEO更新
   */
  const triggerSEOUpdate = useCallback(async (
    contentType: 'work' | 'user',
    contentId: string
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/seo/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType,
          contentId
        })
      });

      if (!response.ok) {
        console.error('Failed to trigger SEO update:', response.statusText);
        return false;
      }

      const data = await response.json();
      console.log('SEO update triggered:', data.message);
      return true;
    } catch (error) {
      console.error('Error triggering SEO update:', error);
      return false;
    }
  }, []);

  /**
   * 分析页面SEO性能
   */
  const analyzeSEOPerformance = useCallback(async (
    url: string,
    seoData?: SEOData
  ) => {
    try {
      const response = await fetch('/api/seo/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          seoData
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze SEO: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing SEO performance:', error);
      throw error;
    }
  }, []);

  /**
   * 获取关键词排名
   */
  const getKeywordRankings = useCallback(async (keywords: string[]) => {
    try {
      const keywordsParam = keywords.join(',');
      const response = await fetch(`/api/seo/analyze?keywords=${encodeURIComponent(keywordsParam)}`);

      if (!response.ok) {
        throw new Error(`Failed to get keyword rankings: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting keyword rankings:', error);
      throw error;
    }
  }, []);

  /**
   * 获取SEO健康状态
   */
  const getSEOHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/seo/update');

      if (!response.ok) {
        throw new Error(`Failed to get SEO health: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting SEO health:', error);
      throw error;
    }
  }, []);

  /**
   * 生成页面元数据
   */
  const generatePageMetadata = useCallback((seoData: SEOData) => {
    return generateMetadata(seoData);
  }, []);

  return {
    triggerSEOUpdate,
    analyzeSEOPerformance,
    getKeywordRankings,
    getSEOHealth,
    generatePageMetadata
  };
}