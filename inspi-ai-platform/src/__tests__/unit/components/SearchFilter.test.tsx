/**
 * 搜索筛选组件测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { SearchFilter } from '@/components/search/SearchFilter';

// Mock搜索服务
const mockSearchService = {
  searchWorks: jest.fn(),
  getSearchSuggestions: jest.fn(),
  getPopularTags: jest.fn(),
};

jest.mock('@/lib/services/searchService', () => mockSearchService);

// Mock防抖hook
const mockUseDebounce = jest.fn();
jest.mock('@/shared/hooks/useDebounce', () => ({
  useDebounce: mockUseDebounce,
}));

describe('SearchFilter组件测试', () => {
  const defaultProps = {
    onSearch: jest.fn(),
    onFilterChange: jest.fn(),
    placeholder: '搜索作品、知识点...',
    showFilters: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDebounce.mockImplementation((value) => value);
    mockSearchService.getSearchSuggestions.mockResolvedValue([
      '二次函数',
      '三角函数',
      '导数',
    ]);
    mockSearchService.getPopularTags.mockResolvedValue([
      { name: '函数', count: 156 },
      { name: '几何', count: 89 },
      { name: '代数', count: 67 },
    ]);
  });

  describe('基础渲染', () => {
    test('应该正确渲染搜索框', () => {
      render(<SearchFilter {...defaultProps} />);

      expect(screen.getByTestId('search-filter')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('搜索作品、知识点...')).toBeInTheDocument();
      expect(screen.getByLabelText('搜索')).toBeInTheDocument();
    });

    test('应该显示筛选器', () => {
      render(<SearchFilter {...defaultProps} />);

      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
      expect(screen.getByLabelText('学科')).toBeInTheDocument();
      expect(screen.getByLabelText('学段')).toBeInTheDocument();
      expect(screen.getByLabelText('排序方式')).toBeInTheDocument();
    });

    test('应该隐藏筛选器当showFilters为false', () => {
      render(<SearchFilter {...defaultProps} showFilters={false} />);

      expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();
    });

    test('应该显示搜索图标', () => {
      render(<SearchFilter {...defaultProps} />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });
  });

  describe('搜索功能', () => {
    test('应该处理搜索输入', async () => {
      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      await userEvent.type(searchInput, '二次函数');

      expect(searchInput).toHaveValue('二次函数');
    });

    test('应该触发搜索回调', async () => {
      mockUseDebounce.mockImplementation((value) => value);

      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      await userEvent.type(searchInput, '二次函数');

      await waitFor(() => {
        expect(defaultProps.onSearch).toHaveBeenCalledWith('二次函数');
      });
    });

    test('应该防抖处理搜索输入', async () => {
      let debouncedValue = '';
      mockUseDebounce.mockImplementation((value) => {
        setTimeout(() => {
          debouncedValue = value;
        }, 300);
        return debouncedValue;
      });

      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');

      // 快速输入
      await userEvent.type(searchInput, '二次函数');

      // 立即不应该触发搜索
      expect(defaultProps.onSearch).not.toHaveBeenCalled();

      // 等待防抖时间
      await waitFor(() => {
        expect(defaultProps.onSearch).toHaveBeenCalledWith('二次函数');
      }, { timeout: 500 });
    });

    test('应该处理Enter键搜索', async () => {
      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      await userEvent.type(searchInput, '二次函数');
      await userEvent.keyboard('{Enter}');

      expect(defaultProps.onSearch).toHaveBeenCalledWith('二次函数');
    });

    test('应该处理搜索按钮点击', async () => {
      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      const searchButton = screen.getByLabelText('搜索');

      await userEvent.type(searchInput, '二次函数');
      await userEvent.click(searchButton);

      expect(defaultProps.onSearch).toHaveBeenCalledWith('二次函数');
    });

    test('应该清空搜索', async () => {
      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      await userEvent.type(searchInput, '二次函数');

      const clearButton = screen.getByLabelText('清空搜索');
      await userEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(defaultProps.onSearch).toHaveBeenCalledWith('');
    });
  });

  describe('搜索建议', () => {
    test('应该显示搜索建议', async () => {
      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      await userEvent.type(searchInput, '函数');

      await waitFor(() => {
        expect(screen.getByTestId('search-suggestions')).toBeInTheDocument();
        expect(screen.getByText('二次函数')).toBeInTheDocument();
        expect(screen.getByText('三角函数')).toBeInTheDocument();
      });
    });

    test('应该处理建议点击', async () => {
      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      await userEvent.type(searchInput, '函数');

      await waitFor(() => {
        expect(screen.getByText('二次函数')).toBeInTheDocument();
      });

      const suggestion = screen.getByText('二次函数');
      await userEvent.click(suggestion);

      expect(searchInput).toHaveValue('二次函数');
      expect(defaultProps.onSearch).toHaveBeenCalledWith('二次函数');
    });

    test('应该使用键盘导航建议', async () => {
      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      await userEvent.type(searchInput, '函数');

      await waitFor(() => {
        expect(screen.getByTestId('search-suggestions')).toBeInTheDocument();
      });

      // 使用方向键导航
      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByText('二次函数')).toHaveClass('highlighted');

      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByText('三角函数')).toHaveClass('highlighted');

      await userEvent.keyboard('{Enter}');
      expect(searchInput).toHaveValue('三角函数');
    });

    test('应该在失去焦点时隐藏建议', async () => {
      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      await userEvent.type(searchInput, '函数');

      await waitFor(() => {
        expect(screen.getByTestId('search-suggestions')).toBeInTheDocument();
      });

      // 点击外部
      await userEvent.click(document.body);

      await waitFor(() => {
        expect(screen.queryByTestId('search-suggestions')).not.toBeInTheDocument();
      });
    });
  });

  describe('筛选功能', () => {
    test('应该处理学科筛选', async () => {
      render(<SearchFilter {...defaultProps} />);

      const subjectSelect = screen.getByLabelText('学科');
      await userEvent.selectOptions(subjectSelect, '数学');

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        subject: '数学',
      });
    });

    test('应该处理学段筛选', async () => {
      render(<SearchFilter {...defaultProps} />);

      const gradeLevelSelect = screen.getByLabelText('学段');
      await userEvent.selectOptions(gradeLevelSelect, '高中');

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        gradeLevel: '高中',
      });
    });

    test('应该处理排序方式', async () => {
      render(<SearchFilter {...defaultProps} />);

      const sortSelect = screen.getByLabelText('排序方式');
      await userEvent.selectOptions(sortSelect, 'most-viewed');

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        sortBy: 'views',
        order: 'desc',
      });
    });

    test('应该处理多个筛选条件', async () => {
      render(<SearchFilter {...defaultProps} />);

      const subjectSelect = screen.getByLabelText('学科');
      const gradeLevelSelect = screen.getByLabelText('学段');

      await userEvent.selectOptions(subjectSelect, '数学');
      await userEvent.selectOptions(gradeLevelSelect, '高中');

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        subject: '数学',
        gradeLevel: '高中',
      });
    });

    test('应该重置筛选条件', async () => {
      render(<SearchFilter {...defaultProps} />);

      const subjectSelect = screen.getByLabelText('学科');
      await userEvent.selectOptions(subjectSelect, '数学');

      const resetButton = screen.getByText('重置筛选');
      await userEvent.click(resetButton);

      expect(subjectSelect).toHaveValue('');
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({});
    });
  });

  describe('热门标签', () => {
    test('应该显示热门标签', async () => {
      render(<SearchFilter {...defaultProps} showPopularTags={true} />);

      await waitFor(() => {
        expect(screen.getByText('热门标签')).toBeInTheDocument();
        expect(screen.getByText('函数')).toBeInTheDocument();
        expect(screen.getByText('几何')).toBeInTheDocument();
        expect(screen.getByText('代数')).toBeInTheDocument();
      });
    });

    test('应该显示标签使用次数', async () => {
      render(<SearchFilter {...defaultProps} showPopularTags={true} />);

      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument(); // 函数标签次数
        expect(screen.getByText('89')).toBeInTheDocument(); // 几何标签次数
      });
    });

    test('应该处理标签点击', async () => {
      render(<SearchFilter {...defaultProps} showPopularTags={true} />);

      await waitFor(() => {
        expect(screen.getByText('函数')).toBeInTheDocument();
      });

      const tag = screen.getByText('函数');
      await userEvent.click(tag);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      expect(searchInput).toHaveValue('函数');
      expect(defaultProps.onSearch).toHaveBeenCalledWith('函数');
    });
  });

  describe('高级筛选', () => {
    test('应该显示高级筛选选项', async () => {
      render(<SearchFilter {...defaultProps} showAdvancedFilters={true} />);

      const advancedToggle = screen.getByText('高级筛选');
      await userEvent.click(advancedToggle);

      expect(screen.getByLabelText('创建时间')).toBeInTheDocument();
      expect(screen.getByLabelText('浏览量范围')).toBeInTheDocument();
      expect(screen.getByLabelText('点赞数范围')).toBeInTheDocument();
    });

    test('应该处理时间范围筛选', async () => {
      render(<SearchFilter {...defaultProps} showAdvancedFilters={true} />);

      const advancedToggle = screen.getByText('高级筛选');
      await userEvent.click(advancedToggle);

      const dateRangeSelect = screen.getByLabelText('创建时间');
      await userEvent.selectOptions(dateRangeSelect, 'last-week');

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        dateRange: 'last-week',
      });
    });

    test('应该处理数值范围筛选', async () => {
      render(<SearchFilter {...defaultProps} showAdvancedFilters={true} />);

      const advancedToggle = screen.getByText('高级筛选');
      await userEvent.click(advancedToggle);

      const minViews = screen.getByLabelText('最少浏览量');
      const maxViews = screen.getByLabelText('最多浏览量');

      await userEvent.type(minViews, '100');
      await userEvent.type(maxViews, '1000');

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        viewsRange: { min: 100, max: 1000 },
      });
    });
  });

  describe('搜索历史', () => {
    test('应该显示搜索历史', () => {
      const historyProps = {
        ...defaultProps,
        showHistory: true,
        searchHistory: ['二次函数', '三角函数', '导数'],
      };

      render(<SearchFilter {...historyProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      fireEvent.focus(searchInput);

      expect(screen.getByText('搜索历史')).toBeInTheDocument();
      expect(screen.getByText('二次函数')).toBeInTheDocument();
      expect(screen.getByText('三角函数')).toBeInTheDocument();
    });

    test('应该处理历史记录点击', async () => {
      const historyProps = {
        ...defaultProps,
        showHistory: true,
        searchHistory: ['二次函数'],
      };

      render(<SearchFilter {...historyProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      fireEvent.focus(searchInput);

      const historyItem = screen.getByText('二次函数');
      await userEvent.click(historyItem);

      expect(searchInput).toHaveValue('二次函数');
      expect(defaultProps.onSearch).toHaveBeenCalledWith('二次函数');
    });

    test('应该清除搜索历史', async () => {
      const onClearHistory = jest.fn();
      const historyProps = {
        ...defaultProps,
        showHistory: true,
        searchHistory: ['二次函数'],
        onClearHistory,
      };

      render(<SearchFilter {...historyProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      fireEvent.focus(searchInput);

      const clearButton = screen.getByLabelText('清除搜索历史');
      await userEvent.click(clearButton);

      expect(onClearHistory).toHaveBeenCalled();
    });
  });

  describe('响应式设计', () => {
    test('应该在移动设备上调整布局', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      render(<SearchFilter {...defaultProps} />);

      expect(screen.getByTestId('search-filter')).toHaveClass('mobile-layout');
    });

    test('应该在小屏幕上隐藏部分筛选器', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      render(<SearchFilter {...defaultProps} />);

      expect(screen.queryByLabelText('排序方式')).not.toBeInTheDocument();
    });

    test('应该在移动设备上显示筛选按钮', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      render(<SearchFilter {...defaultProps} />);

      expect(screen.getByText('筛选')).toBeInTheDocument();
    });
  });

  describe('无障碍性', () => {
    test('应该提供适当的ARIA标签', () => {
      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      expect(searchInput).toHaveAttribute('role', 'searchbox');
      expect(searchInput).toHaveAttribute('aria-label', '搜索输入框');

      const filterPanel = screen.getByTestId('filter-panel');
      expect(filterPanel).toHaveAttribute('role', 'group');
      expect(filterPanel).toHaveAttribute('aria-label', '筛选选项');
    });

    test('应该支持键盘导航', async () => {
      render(<SearchFilter {...defaultProps} />);

      // Tab键导航
      await userEvent.tab();
      expect(screen.getByPlaceholderText('搜索作品、知识点...')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText('学科')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText('学段')).toHaveFocus();
    });

    test('应该提供屏幕阅读器支持', () => {
      render(<SearchFilter {...defaultProps} />);

      expect(screen.getByText('搜索和筛选作品')).toHaveAttribute('role', 'heading');
      expect(screen.getByLabelText('搜索结果将在下方显示')).toBeInTheDocument();
    });

    test('应该在搜索时提供状态反馈', async () => {
      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      await userEvent.type(searchInput, '二次函数');

      expect(screen.getByRole('status')).toHaveTextContent('正在搜索...');
    });
  });

  describe('性能优化', () => {
    test('应该防抖处理筛选变化', async () => {
      jest.useFakeTimers();

      render(<SearchFilter {...defaultProps} />);

      const subjectSelect = screen.getByLabelText('学科');

      // 快速多次选择
      await userEvent.selectOptions(subjectSelect, '数学');
      await userEvent.selectOptions(subjectSelect, '物理');
      await userEvent.selectOptions(subjectSelect, '化学');

      // 应该防抖处理
      expect(defaultProps.onFilterChange).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    test('应该缓存搜索建议', async () => {
      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');

      // 第一次搜索
      await userEvent.type(searchInput, '函数');
      await waitFor(() => {
        expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledTimes(1);
      });

      // 清空后重新输入相同内容
      await userEvent.clear(searchInput);
      await userEvent.type(searchInput, '函数');

      // 应该使用缓存
      expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledTimes(1);
    });

    test('应该限制建议数量', async () => {
      mockSearchService.getSearchSuggestions.mockResolvedValue(
        Array(20).fill(null).map((_, i) => `建议${i}`),
      );

      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      await userEvent.type(searchInput, '函数');

      await waitFor(() => {
        const suggestions = screen.getAllByTestId('suggestion-item');
        expect(suggestions).toHaveLength(10); // 限制为10个
      });
    });
  });

  describe('错误处理', () => {
    test('应该处理搜索建议加载失败', async () => {
      mockSearchService.getSearchSuggestions.mockRejectedValue(new Error('网络错误'));

      render(<SearchFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜索作品、知识点...');
      await userEvent.type(searchInput, '函数');

      await waitFor(() => {
        expect(screen.queryByTestId('search-suggestions')).not.toBeInTheDocument();
      });
    });

    test('应该处理热门标签加载失败', async () => {
      mockSearchService.getPopularTags.mockRejectedValue(new Error('加载失败'));

      render(<SearchFilter {...defaultProps} showPopularTags={true} />);

      await waitFor(() => {
        expect(screen.queryByText('热门标签')).not.toBeInTheDocument();
      });
    });

    test('应该处理无效的筛选值', async () => {
      render(<SearchFilter {...defaultProps} />);

      const minViews = screen.getByLabelText('最少浏览量');
      await userEvent.type(minViews, 'invalid');

      expect(screen.getByText('请输入有效数字')).toBeInTheDocument();
    });
  });
});
