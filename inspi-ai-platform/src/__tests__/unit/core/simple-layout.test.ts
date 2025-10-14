/**
 * 简化的布局算法测试
 */
import { describe, it, expect } from '@jest/globals';

describe('布局算法基础测试', () => {
  it('应该能够执行基本的数学计算', () => {
    // 测试力导向布局的基本数学
    const distance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const point1 = { x: 0, y: 0 };
    const point2 = { x: 3, y: 4 };
    expect(distance(point1, point2)).toBe(5);
  });

  it('应该能够计算圆形布局位置', () => {
    const calculateCircularPosition = (index: number, total: number, radius: number, centerX: number, centerY: number) => {
      const angle = (2 * Math.PI * index) / total;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    };

    const pos = calculateCircularPosition(0, 4, 100, 400, 300);
    expect(pos.x).toBeCloseTo(500, 1);
    expect(pos.y).toBeCloseTo(300, 1);
  });

  it('应该能够计算网格布局位置', () => {
    const calculateGridPosition = (index: number, columns: number, cellWidth: number, cellHeight: number) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      return {
        x: (col + 0.5) * cellWidth,
        y: (row + 0.5) * cellHeight,
      };
    };

    const pos = calculateGridPosition(5, 3, 100, 80);
    expect(pos.x).toBe(250); // (2 + 0.5) * 100
    expect(pos.y).toBe(120); // (1 + 0.5) * 80
  });

  it('应该能够进行布局性能评估', () => {
    const estimateComplexity = (nodeCount: number, edgeCount: number) => {
      if (nodeCount <= 10) return 'low';
      if (nodeCount <= 100) return 'medium';
      return 'high';
    };

    expect(estimateComplexity(5, 4)).toBe('low');
    expect(estimateComplexity(50, 60)).toBe('medium');
    expect(estimateComplexity(500, 800)).toBe('high');
  });

  it('应该能够推荐合适的布局算法', () => {
    const recommendLayout = (nodeCount: number, edgeCount: number, hasHierarchy: boolean) => {
      if (nodeCount <= 10) return 'circular';
      if (hasHierarchy && nodeCount <= 50) return 'hierarchical';
      if (nodeCount <= 100) return 'force';
      return 'grid';
    };

    expect(recommendLayout(5, 4, false)).toBe('circular');
    expect(recommendLayout(30, 25, true)).toBe('hierarchical');
    expect(recommendLayout(80, 120, false)).toBe('force');
    expect(recommendLayout(200, 300, false)).toBe('grid');
  });
});
