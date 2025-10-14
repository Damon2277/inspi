/**
 * 仪式感设计系统 - 主要导出文件
 * Ritual Design System - Main Export
 */

import {
  RitualDesignSystem,
  getRitualSystem
} from './RitualDesignSystem';
import type { RitualSystemConfig } from './RitualDesignSystem';

// 主系统类
export {
  RitualDesignSystem,
  getRitualSystem,
  destroyRitualSystem,
  RitualSystemConfig,
  RitualSystemStatus,
  RitualExecutionResult
} from './RitualDesignSystem';

// 核心类型和接口
export * from './types';

// 核心检测系统
export * from './core';

// 视觉系统
export * from './visual';

// 动画系统
export * from './animation';

// 音频系统
export { AudioRitualManager, Mood } from './audio/AudioRitualManager';

// 个性化系统
export * from './personalization/PersonalizedRitualEngine';

// 配置管理系统
export * from './config';

// 使用示例和演示
export { demonstrateCompleteSystem, performanceStressTest } from './examples/complete-system-demo';

// 版本信息
export const VERSION = '1.0.0';
export const BUILD_DATE = new Date().toISOString();

// 系统信息
export const SYSTEM_INFO = {
  name: 'Ritual Design System',
  version: VERSION,
  description: '智能仪式感设计系统 - 为用户创造有意义的数字体验',
  author: 'Inspi AI Team',
  license: 'MIT',
  buildDate: BUILD_DATE,
  features: [
    '智能行为检测',
    '多感官仪式体验',
    '个性化学习引擎',
    '文化适配支持',
    '可访问性优化',
    '性能监控优化',
    '配置管理系统',
    '热更新支持'
  ]
} as const;

// 快速开始函数
export function quickStart(config?: Partial<RitualSystemConfig>) {
  console.log(`🎭 ${SYSTEM_INFO.name} v${SYSTEM_INFO.version}`);
  console.log(`📅 构建日期: ${SYSTEM_INFO.buildDate}`);
  console.log(`✨ 特性: ${SYSTEM_INFO.features.join(', ')}`);
  
  const system = getRitualSystem(config);
  console.log('🚀 系统已初始化，准备就绪！');
  
  return system;
}

// 默认导出
export default {
  RitualDesignSystem,
  getRitualSystem,
  quickStart,
  VERSION,
  SYSTEM_INFO
};
