/**
 * 智慧广场性能基准测试
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import SquarePage from '@/app/square/page';
import { PerformanceMonitor } from '@/utils/performance';

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
  get: jest.fn().mockReturnValue(null)
};

// 生成测试数据
const generateMockWorks = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `work-${i}`,
    title: `测试作品 ${i}`,
    knowledgePoint: `知识点 ${i}`,
    subject: i % 2 === 0 ? '数学' : '语文',
    gradeLevel: `小学${(i % 6) + 1}年级`,
    author: {
      id: `user-${i}`,
      name: `老师${i}`,
      avatar: i % 3 === 0 ? `https://example.com/avatar${i}.jpg` : null
    },
    reuseCount: Math.floor(Math.random() * 100),
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
    tags: [`标签${i}`, `类别${i % 5}`],
    cardCount: Math.floor(Math.random() * 8) + 1,
    cardTypes: ['visualization', 'analogy', 'thinking', 'interaction'].slice(0, Math.floor(Math.random() * 4) + 1)
  }));
};

describe('Square Page Performance Benchmarks', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    performanceMonitor = PerformanceMonitor.getInstance();
    performanceMonitor.clearMetrics();
    jest.clearAllMocks();
  });

  describe('Rendering Performance', () => {
    it('should render 12 works within 500ms', async () => {
      const works = generateMockWorks(12);
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          data: {
            works,
            pagination: {
              page: 1,
              limit: 12,
              total: 12,
              totalPages: 1,
              hasNext: false,
              hasPrev: false
            },
            filters: {
              subjects: [{ value: '数学', label: '数学', count: 6 }],
              gradeLevels: [{ value: '小学一年级', label: '小学一年级', count: 2 }],
              availableTags: ['标签1', '标签2']
            }
          }
        })
      });

      const startTime = performance.now();
      
      render(<SquarePage />);
      
      await waitFor(() => {
        expect(screen.getByText('测试作品 0')).toBeInTheDocument();
      });
      
      const renderTime = performance.now() - startTime;
      
      expect(renderTime).toBeLessThan(500);
      console.log(`12 works rendered in ${renderTime.toFixed(2)}ms`);
    });

    it('should render 50 works within 1000ms', async () => {
      const works = generateMockWorks(50);
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          data: {
            works,
            pagination: {
              page: 1,
              limit: 50,
              total: 50,
              totalPages: 1,
              hasNext: false,
              hasPrev: false
            },
            filters: {
              subjects: [{ value: '数学', label: '数学', count: 25 }],
              gradeLevels: [{ value: '小学一年级', label: '小学一年级', count: 8 }],
              availableTags: ['标签1', '标签2']
            }
          }
        })
      });

      const startTime = performance.now();
      
      render(<SquarePage />);
      
      await waitFor(() => {
        expect(screen.getByText('测试作品 0')).toBeInTheDocument();
      }, { timeout: 2000 });
      
      const renderTime = performance.now() - startTime;
      
      expect(renderTime).toBeLessThan(1000);
      console.log(`50 works rendered in ${renderTime.toFixed(2)}ms`);
    });

    it('should handle 100 works without memory leaks', async () => {
      const works = generateMockWorks(100);
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          data: {
            works,
            pagination: {
              page: 1,
              limit: 100,
              total: 100,
              totalPages: 1,
              hasNext: false,
              hasPrev: false
            },
            filters: {
              subjects: [{ value: '数学', label: '数学', count: 50 }],
              gradeLevels: [{ value: '小学一年级', label: '小学一年级', count: 16 }],
              availableTags: ['标签1', '标签2']
            }
          }
        })
      });

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      const { unmount } = render(<SquarePage />);
      
      await waitFor(() => {
        expect(screen.getByText('测试作品 0')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      unmount();
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // 内存增长应该在合理范围内（小于10MB）
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('API Performance', () => {
    it('should handle API response within 200ms', async () => {
      const works = generateMockWorks(12);
      let apiCallTime = 0;
      
      (global.fetch as jest.Mock).mockImplementation(() => {
        const startTime = performance.now();
        return Promise.resolve({
          json: () => {
            apiCallTime = performance.now() - startTime;
            return Promise.resolve({
              success: true,
              data: {
                works,
                pagination: {
                  page: 1,
                  limit: 12,
                  total: 12,
                  totalPages: 1,
                  hasNext: false,
                  hasPrev: false
                },
                filters: {
                  subjects: [],
                  gradeLevels: [],
                  availableTags: []
                }
              }
            });
          }
        });
      });

      render(<SquarePage />);
      
      await waitFor(() => {
        expect(screen.getByText('测试作品 0')).toBeInTheDocument();
      });
      
      expect(apiCallTime).toBeLessThan(200);
      console.log(`API response processed in ${apiCallTime.toFixed(2)}ms`);
    });

    it('should handle multiple concurrent API calls efficiently', async () => {
      const works = generateMockWorks(12);
      let callCount = 0;
      
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            data: {
              works,
              pagination: {
                page: 1,
                limit: 12,
                total: 12,
                totalPages: 1,
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
      });

      const startTime = performance.now();
      
      // 渲染多个实例来模拟并发
      const instances = Array.from({ length: 5 }, () => render(<SquarePage />));
      
      await Promise.all(instances.map(({ container }) => 
        waitFor(() => {
          expect(container.querySelector('[data-testid="work-card"]') || 
                 container.textContent?.includes('测试作品')).toBeTruthy();
        })
      ));
      
      const totalTime = performance.now() - startTime;
      
      expect(totalTime).toBeLessThan(1000);
      console.log(`${callCount} concurrent API calls completed in ${totalTime.toFixed(2)}ms`);
      
      // 清理
      instances.forEach(({ unmount }) => unmount());
    });
  });

  describe('Interaction Performance', () => {
    it('should handle search input changes efficiently', async () => {
      const works = generateMockWorks(12);
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          data: {
            works,
            pagination: {
              page: 1,
              limit: 12,
              total: 12,
              totalPages: 1,
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
        expect(screen.getByText('测试作品 0')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('搜索知识点、标题或作者...');
      
      const startTime = performance.now();
      
      // 模拟快速输入
      for (let i = 0; i < 10; i++) {
        searchInput.focus();
        (searchInput as HTMLInputElement).value = `搜索${i}`;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      const inputTime = performance.now() - startTime;
      
      expect(inputTime).toBeLessThan(100);
      console.log(`10 search input changes handled in ${inputTime.toFixed(2)}ms`);
    });

    it('should handle filter changes efficiently', async () => {
      const works = generateMockWorks(12);
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          data: {
            works,
            pagination: {
              page: 1,
              limit: 12,
              total: 12,
              totalPages: 1,
              hasNext: false,
              hasPrev: false
            },
            filters: {
              subjects: [
                { value: '数学', label: '数学', count: 6 },
                { value: '语文', label: '语文', count: 6 }
              ],
              gradeLevels: [
                { value: '小学一年级', label: '小学一年级', count: 2 },
                { value: '小学二年级', label: '小学二年级', count: 2 }
              ],
              availableTags: []
            }
          }
        })
      });

      render(<SquarePage />);
      
      await waitFor(() => {
        expect(screen.getByText('筛选')).toBeInTheDocument();
      });

      const startTime = performance.now();
      
      // 打开筛选面板
      const filterButton = screen.getByText('筛选');
      filterButton.click();
      
      await waitFor(() => {
        expect(screen.getByText('学科')).toBeInTheDocument();
      });
      
      // 点击多个筛选选项
      const mathFilter = screen.getByText('数学');
      mathFilter.click();
      
      const filterTime = performance.now() - startTime;
      
      expect(filterTime).toBeLessThan(200);
      console.log(`Filter interaction completed in ${filterTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should maintain stable memory usage during normal operations', async () => {
      const works = generateMockWorks(20);
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          data: {
            works,
            pagination: {
              page: 1,
              limit: 20,
              total: 20,
              totalPages: 1,
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

      const memoryReadings: number[] = [];
      
      const { rerender } = render(<SquarePage />);
      
      await waitFor(() => {
        expect(screen.getByText('测试作品 0')).toBeInTheDocument();
      });

      // 记录多次重渲染的内存使用
      for (let i = 0; i < 5; i++) {
        rerender(<SquarePage />);
        await waitFor(() => {
          expect(screen.getByText('测试作品 0')).toBeInTheDocument();
        });
        
        if ((performance as any).memory) {
          memoryReadings.push((performance as any).memory.usedJSHeapSize);
        }
        
        // 等待一小段时间
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (memoryReadings.length > 0) {
        const maxMemory = Math.max(...memoryReadings);
        const minMemory = Math.min(...memoryReadings);
        const memoryVariation = maxMemory - minMemory;
        
        // 内存变化应该在合理范围内（小于5MB）
        expect(memoryVariation).toBeLessThan(5 * 1024 * 1024);
        console.log(`Memory variation: ${(memoryVariation / 1024 / 1024).toFixed(2)}MB`);
      }
    });
  });
});