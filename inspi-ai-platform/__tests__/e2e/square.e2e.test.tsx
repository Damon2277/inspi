/**
 * 智慧广场端到端测试
 * 测试完整的用户流程
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import SquarePage from '@/app/square/page';

// Mock Next.js hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn()
}));

// Mock hooks
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: jest.fn((value) => value)
}));

jest.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: jest.fn(() => ({ loadingRef: { current: null } }))
}));

// Mock fetch
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn()
};

const mockSearchParams = {
  get: jest.fn()
};

const mockWorksResponse = {
  success: true,
  data: {
    works: [
      {
        id: '1',
        title: '数学加法教学',
        knowledgePoint: '两位数加法',
        subject: '数学',
        gradeLevel: '小学二年级',
        author: {
          id: 'user1',
          name: '张老师',
          avatar: null
        },
        reuseCount: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tags: ['数学', '加法'],
        cardCount: 4,
        cardTypes: ['visualization', 'analogy', 'thinking', 'interaction']
      },
      {
        id: '2',
        title: '语文阅读理解',
        knowledgePoint: '文章主旨理解',
        subject: '语文',
        gradeLevel: '小学三年级',
        author: {
          id: 'user2',
          name: '李老师',
          avatar: null
        },
        reuseCount: 3,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        tags: ['语文', '阅读'],
        cardCount: 3,
        cardTypes: ['thinking', 'interaction', 'visualization']
      }
    ],
    pagination: {
      page: 1,
      limit: 12,
      total: 2,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    },
    filters: {
      subjects: [
        { value: '数学', label: '数学', count: 1 },
        { value: '语文', label: '语文', count: 1 }
      ],
      gradeLevels: [
        { value: '小学二年级', label: '小学二年级', count: 1 },
        { value: '小学三年级', label: '小学三年级', count: 1 }
      ],
      availableTags: ['数学', '加法', '语文', '阅读']
    }
  }
};

describe('Square Page E2E Tests', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (mockSearchParams.get as jest.Mock).mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockWorksResponse)
    });
    jest.clearAllMocks();
  });

  describe('Complete User Journey', () => {
    it('should complete a full search and filter workflow', async () => {
      const user = userEvent.setup();
      
      // 1. 渲染页面
      render(<SquarePage />);
      
      // 2. 等待初始数据加载
      await waitFor(() => {
        expect(screen.getByText('数学加法教学')).toBeInTheDocument();
        expect(screen.getByText('语文阅读理解')).toBeInTheDocument();
      });
      
      // 3. 验证初始状态
      expect(screen.getByText('找到 2 个作品')).toBeInTheDocument();
      
      // 4. 执行搜索
      const searchInput = screen.getByPlaceholderText('搜索知识点、标题或作者...');
      await user.type(searchInput, '数学');
      await user.keyboard('{Enter}');
      
      // 5. 验证搜索结果更新
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          expect.stringContaining('search='),
          expect.any(Object)
        );
      });
      
      // 6. 打开筛选面板
      const filterButton = screen.getByText('筛选');
      await user.click(filterButton);
      
      // 7. 验证筛选面板展开
      expect(screen.getByText('学科')).toBeInTheDocument();
      expect(screen.getByText('学段')).toBeInTheDocument();
      
      // 8. 选择学科筛选
      const mathFilter = screen.getByText('数学');
      await user.click(mathFilter);
      
      // 9. 验证筛选状态更新
      await waitFor(() => {
        expect(screen.getByText('学科: 数学')).toBeInTheDocument();
      });
      
      // 10. 更改排序方式
      const sortSelect = screen.getByDisplayValue('最新发布');
      await user.selectOptions(sortSelect, 'popular');
      
      // 11. 验证API调用包含正确参数
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('sortBy=popular')
        );
      });
      
      // 12. 清除筛选
      const resetButton = screen.getByText('清除筛选');
      await user.click(resetButton);
      
      // 13. 验证筛选被清除
      await waitFor(() => {
        expect(screen.queryByText('学科: 数学')).not.toBeInTheDocument();
      });
    });

    it('should handle work interaction workflow', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<SquarePage />);
      
      // 等待作品加载
      await waitFor(() => {
        expect(screen.getByText('数学加法教学')).toBeInTheDocument();
      });
      
      // 测试作品复用
      const reuseButton = screen.getByText('复用');
      await user.click(reuseButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('复用作品:', '1');
      
      // 测试作品查看
      const workCard = screen.getByText('数学加法教学').closest('div');
      await user.click(workCard!);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/works/1');
      
      consoleSpy.mockRestore();
    });

    it('should handle empty state and error scenarios', async () => {
      // 测试空状态
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: {
            works: [],
            pagination: {
              page: 1,
              limit: 12,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            },
            filters: {
              subjects: [],
              gradeLevels: [],
              availableTags: []
            }
          }
        })
      });
      
      render(<SquarePage />);
      
      await waitFor(() => {
        expect(screen.getByText('暂无作品')).toBeInTheDocument();
      });
      
      // 测试错误状态
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));
      
      // 触发重新获取数据
      const searchInput = screen.getByPlaceholderText('搜索知识点、标题或作者...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('获取作品失败:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });

    it('should handle responsive behavior', async () => {
      // 模拟移动端视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<SquarePage />);
      
      await waitFor(() => {
        expect(screen.getByText('智慧广场')).toBeInTheDocument();
      });
      
      // 验证响应式布局
      const workGrid = document.querySelector('.grid');
      expect(workGrid).toHaveClass('grid-cols-1');
      
      // 恢复桌面端视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
    });

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<SquarePage />);
      
      await waitFor(() => {
        expect(screen.getByText('数学加法教学')).toBeInTheDocument();
      });
      
      // 测试Tab导航
      await user.tab();
      expect(screen.getByPlaceholderText('搜索知识点、标题或作者...')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('筛选')).toHaveFocus();
      
      // 测试Enter键激活
      await user.keyboard('{Enter}');
      expect(screen.getByText('学科')).toBeInTheDocument();
      
      // 测试Escape键关闭
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByText('学科')).not.toBeInTheDocument();
      });
    });

    it('should maintain state during navigation', async () => {
      const user = userEvent.setup();
      
      // 设置初始URL参数
      (mockSearchParams.get as jest.Mock)
        .mockReturnValueOnce('数学') // search
        .mockReturnValueOnce('小学二年级') // gradeLevel
        .mockReturnValueOnce('popular'); // sortBy
      
      render(<SquarePage />);
      
      // 验证状态从URL恢复
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=数学')
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('gradeLevel=小学二年级')
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('sortBy=popular')
        );
      });
      
      // 验证UI状态
      const searchInput = screen.getByPlaceholderText('搜索知识点、标题或作者...');
      expect(searchInput).toHaveValue('数学');
      
      const sortSelect = screen.getByDisplayValue('最受欢迎');
      expect(sortSelect).toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    it('should load within acceptable time limits', async () => {
      const startTime = performance.now();
      
      render(<SquarePage />);
      
      await waitFor(() => {
        expect(screen.getByText('数学加法教学')).toBeInTheDocument();
      });
      
      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(2000); // 2秒内加载完成
    });

    it('should handle large datasets efficiently', async () => {
      // 模拟大量数据
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `work-${i}`,
        title: `作品 ${i}`,
        knowledgePoint: `知识点 ${i}`,
        subject: '数学',
        gradeLevel: '小学二年级',
        author: { id: `user-${i}`, name: `老师${i}`, avatar: null },
        reuseCount: i,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['数学'],
        cardCount: 4,
        cardTypes: ['visualization']
      }));

      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          data: {
            works: largeDataset,
            pagination: {
              page: 1,
              limit: 12,
              total: 100,
              totalPages: 9,
              hasNext: true,
              hasPrev: false
            },
            filters: mockWorksResponse.data.filters
          }
        })
      });

      const startTime = performance.now();
      
      render(<SquarePage />);
      
      await waitFor(() => {
        expect(screen.getByText('作品 0')).toBeInTheDocument();
      });
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(3000); // 3秒内渲染完成
    });
  });
});