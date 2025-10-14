import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import SquarePage from '@/app/square/page';

// Mock Next.js hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock hooks
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: jest.fn((value) => value),
}));

jest.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: jest.fn(() => ({ loadingRef: { current: null } })),
}));

// Mock fetch
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};

const mockSearchParams = {
  get: jest.fn(),
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
          avatar: null,
        },
        reuseCount: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tags: ['数学', '加法'],
        cardCount: 4,
        cardTypes: ['visualization', 'analogy', 'thinking', 'interaction'],
      },
    ],
    pagination: {
      page: 1,
      limit: 12,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    filters: {
      subjects: [
        { value: '数学', label: '数学', count: 1 },
      ],
      gradeLevels: [
        { value: '小学二年级', label: '小学二年级', count: 1 },
      ],
      availableTags: ['数学', '加法'],
    },
  },
};

describe('SquarePage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (mockSearchParams.get as jest.Mock).mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockWorksResponse),
    });
    jest.clearAllMocks();
  });

  it('renders page title and description', async () => {
    render(<SquarePage />);

    await waitFor(() => {
      expect(screen.getByText('智慧广场')).toBeInTheDocument();
      expect(screen.getByText(/探索全球教师的教学智慧/)).toBeInTheDocument();
    });
  });

  it('renders search bar', async () => {
    render(<SquarePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索知识点、标题或作者...')).toBeInTheDocument();
    });
  });

  it('renders filter bar', async () => {
    render(<SquarePage />);

    await waitFor(() => {
      expect(screen.getByText('筛选')).toBeInTheDocument();
    });
  });

  it('fetches and displays works on initial load', async () => {
    render(<SquarePage />);

    await waitFor(() => {
      expect(screen.getByText('数学加法教学')).toBeInTheDocument();
      expect(screen.getByText('知识点：两位数加法')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/works?'),
    );
  });

  it('updates URL when search is performed', async () => {
    render(<SquarePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索知识点、标题或作者...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('搜索知识点、标题或作者...');
    fireEvent.change(searchInput, { target: { value: '数学' } });
    fireEvent.submit(searchInput.closest('form')!);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining('search=数学'),
        expect.any(Object),
      );
    });
  });

  it('handles work reuse action', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(<SquarePage />);

    await waitFor(() => {
      expect(screen.getByText('复用')).toBeInTheDocument();
    });

    const reuseButton = screen.getByText('复用');
    fireEvent.click(reuseButton);

    expect(consoleSpy).toHaveBeenCalledWith('复用作品:', '1');

    consoleSpy.mockRestore();
  });

  it('handles work view action', async () => {
    render(<SquarePage />);

    await waitFor(() => {
      expect(screen.getByText('数学加法教学')).toBeInTheDocument();
    });

    const workCard = screen.getByText('数学加法教学').closest('div');
    fireEvent.click(workCard!);

    expect(mockRouter.push).toHaveBeenCalledWith('/works/1');
  });

  it('shows loading state initially', () => {
    render(<SquarePage />);

    // Should show loading skeletons
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('handles empty state when no works found', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
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
            hasPrev: false,
          },
          filters: {
            subjects: [],
            gradeLevels: [],
            availableTags: [],
          },
        },
      }),
    });

    render(<SquarePage />);

    await waitFor(() => {
      expect(screen.getByText('暂无作品')).toBeInTheDocument();
      expect(screen.getByText(/还没有找到符合条件的作品/)).toBeInTheDocument();
    });
  });

  it('initializes filters from URL parameters', () => {
    (mockSearchParams.get as jest.Mock)
      .mockReturnValueOnce('数学') // subject
      .mockReturnValueOnce('小学二年级') // gradeLevel
      .mockReturnValueOnce('popular') // sortBy
      .mockReturnValueOnce('加法'); // search

    render(<SquarePage />);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('subject=数学'),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('gradeLevel=小学二年级'),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('sortBy=popular'),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('search=加法'),
    );
  });

  it('shows result count when works are loaded', async () => {
    render(<SquarePage />);

    await waitFor(() => {
      expect(screen.getByText(/找到 1 个作品/)).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<SquarePage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('获取作品失败:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
