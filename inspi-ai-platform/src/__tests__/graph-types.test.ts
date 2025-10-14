/**
 * 图谱类型定义测试
 * 测试类型定义和基础配置
 */
import { describe, it, expect } from '@jest/globals';

import {
  DEFAULT_LAYOUT_CONFIG,
  DEFAULT_VISUAL_CONFIG,
  DEFAULT_INTERACTION_CONFIG,
} from '@/core/graph/types';

describe('图谱可视化类型定义', () => {
  describe('默认配置', () => {
    it('应该有正确的默认布局配置', () => {
      expect(DEFAULT_LAYOUT_CONFIG.type).toBe('force');
      expect(DEFAULT_LAYOUT_CONFIG.width).toBe(800);
      expect(DEFAULT_LAYOUT_CONFIG.height).toBe(600);
      expect(DEFAULT_LAYOUT_CONFIG.options.linkDistance).toBeGreaterThan(0);
      expect(DEFAULT_LAYOUT_CONFIG.options.chargeStrength).toBeLessThan(0);
    });

    it('应该有正确的默认视觉配置', () => {
      expect(DEFAULT_VISUAL_CONFIG.node.defaultRadius).toBeGreaterThan(0);
      expect(DEFAULT_VISUAL_CONFIG.edge.defaultStrokeWidth).toBeGreaterThan(0);
      expect(DEFAULT_VISUAL_CONFIG.colors.nodes).toBeDefined();
      expect(DEFAULT_VISUAL_CONFIG.colors.edges).toBeDefined();
      expect(DEFAULT_VISUAL_CONFIG.animation.duration).toBeGreaterThan(0);
    });

    it('应该有正确的默认交互配置', () => {
      expect(DEFAULT_INTERACTION_CONFIG.zoom.enabled).toBe(true);
      expect(DEFAULT_INTERACTION_CONFIG.drag.enabled).toBe(true);
      expect(DEFAULT_INTERACTION_CONFIG.selection.enabled).toBe(true);
      expect(DEFAULT_INTERACTION_CONFIG.tooltip.enabled).toBe(true);
    });
  });

  describe('颜色配置', () => {
    it('应该为所有节点类型定义颜色', () => {
      const nodeColors = DEFAULT_VISUAL_CONFIG.colors.nodes;
      expect(nodeColors.subject).toBeDefined();
      expect(nodeColors.chapter).toBeDefined();
      expect(nodeColors.topic).toBeDefined();
      expect(nodeColors.concept).toBeDefined();
      expect(nodeColors.skill).toBeDefined();
    });

    it('应该为所有边类型定义颜色', () => {
      const edgeColors = DEFAULT_VISUAL_CONFIG.colors.edges;
      expect(edgeColors.contains).toBeDefined();
      expect(edgeColors.prerequisite).toBeDefined();
      expect(edgeColors.related).toBeDefined();
      expect(edgeColors.extends).toBeDefined();
      expect(edgeColors.applies).toBeDefined();
    });

    it('颜色值应该是有效的十六进制颜色', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      Object.values(DEFAULT_VISUAL_CONFIG.colors.nodes).forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });

      Object.values(DEFAULT_VISUAL_CONFIG.colors.edges).forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });
    });
  });

  describe('配置验证', () => {
    it('节点半径配置应该合理', () => {
      const nodeConfig = DEFAULT_VISUAL_CONFIG.node;
      expect(nodeConfig.minRadius).toBeLessThan(nodeConfig.defaultRadius);
      expect(nodeConfig.defaultRadius).toBeLessThan(nodeConfig.maxRadius);
      expect(nodeConfig.minRadius).toBeGreaterThan(0);
    });

    it('边宽度配置应该合理', () => {
      const edgeConfig = DEFAULT_VISUAL_CONFIG.edge;
      expect(edgeConfig.minStrokeWidth).toBeLessThan(edgeConfig.defaultStrokeWidth);
      expect(edgeConfig.defaultStrokeWidth).toBeLessThan(edgeConfig.maxStrokeWidth);
      expect(edgeConfig.minStrokeWidth).toBeGreaterThan(0);
    });

    it('透明度配置应该在有效范围内', () => {
      const nodeConfig = DEFAULT_VISUAL_CONFIG.node;
      const edgeConfig = DEFAULT_VISUAL_CONFIG.edge;

      expect(nodeConfig.opacity).toBeGreaterThanOrEqual(0);
      expect(nodeConfig.opacity).toBeLessThanOrEqual(1);
      expect(nodeConfig.selectedOpacity).toBeGreaterThanOrEqual(0);
      expect(nodeConfig.selectedOpacity).toBeLessThanOrEqual(1);
      expect(nodeConfig.hoveredOpacity).toBeGreaterThanOrEqual(0);
      expect(nodeConfig.hoveredOpacity).toBeLessThanOrEqual(1);

      expect(edgeConfig.opacity).toBeGreaterThanOrEqual(0);
      expect(edgeConfig.opacity).toBeLessThanOrEqual(1);
      expect(edgeConfig.selectedOpacity).toBeGreaterThanOrEqual(0);
      expect(edgeConfig.selectedOpacity).toBeLessThanOrEqual(1);
      expect(edgeConfig.hoveredOpacity).toBeGreaterThanOrEqual(0);
      expect(edgeConfig.hoveredOpacity).toBeLessThanOrEqual(1);
    });

    it('缩放范围应该合理', () => {
      const zoomConfig = DEFAULT_INTERACTION_CONFIG.zoom;
      expect(zoomConfig.scaleExtent[0]).toBeGreaterThan(0);
      expect(zoomConfig.scaleExtent[0]).toBeLessThan(zoomConfig.scaleExtent[1]);
    });
  });
});
