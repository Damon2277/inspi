/**
 * 布局算法单元测试
 */
import { describe, it, expect, beforeEach } from '@jest/globals';

import { layoutManager } from '@/core/graph/layout-algorithms';

// Mock D3.js functions
const mockD3 = {
  forceSimulation: jest.fn(() => mockD3),
  forceLink: jest.fn(() => mockD3),
  forceManyBody: jest.fn(() => mockD3),
  forceCenter: jest.fn(() => mockD3),
  forceCollide: jest.fn(() => mockD3),
  force: jest.fn(() => mockD3),
  nodes: jest.fn(() => mockD3),
  links: jest.fn(() => mockD3),
  id: jest.fn(() => mockD3),
  distance: jest.fn(() => mockD3),
  strength: jest.fn(() => mockD3),
  radius: jest.fn(() => mockD3),
  alpha: jest.fn(() => mockD3),
  alphaDecay: jest.fn(() => mockD3),
  velocityDecay: jest.fn(() => mockD3),
  stop: jest.fn(() => mockD3),
  hierarchy: jest.fn(),
  tree: jest.fn(() => ({
    size: jest.fn(() => ({
      descendants: jest.fn(() => []),
    })),
  })),
};

jest.mock('d3', () => mockD3);

describe('布局算法', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LayoutManager', () => {
    it('应该注册所有内置算法', () => {
      const algorithmNames = layoutManager.getAlgorithmNames();
      expect(algorithmNames).toContain('force');
      expect(algorithmNames).toContain('hierarchical');
      expect(algorithmNames).toContain('circular');
      expect(algorithmNames).toContain('tree');
      expect(algorithmNames).toContain('grid');
      expect(algorithmNames).toContain('radial');
    });

    it('应该提供布局推荐', () => {
      const recommendation1 = layoutManager.getRecommendedLayout(5, 4, false);
      expect(recommendation1).toBe('circular');

      const recommendation2 = layoutManager.getRecommendedLayout(30, 25, true);
      expect(recommendation2).toBe('hierarchical');

      const recommendation3 = layoutManager.getRecommendedLayout(80, 120, false);
      expect(recommendation3).toBe('force');

      const recommendation4 = layoutManager.getRecommendedLayout(200, 300, false);
      expect(recommendation4).toBe('grid');
    });

    it('应该提供性能评估', () => {
      const performance = layoutManager.estimatePerformance('force', 100, 150);
      expect(performance.complexity).toBeDefined();
      expect(performance.estimatedTime).toBeGreaterThan(0);
      expect(performance.memoryUsage).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(performance.complexity);
      expect(['low', 'medium', 'high']).toContain(performance.memoryUsage);
    });
  });
});
