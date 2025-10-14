/**
 * 动画仪式系统导出
 */

import { EntranceStyle } from './AnimationRitualSystem';

export { 
  AnimationRitualSystem,
  EntranceStyle,
  AnimationConfig,
  Achievement,
  Task,
  Page,
  AnimationEvent,
  PerformanceMetrics
} from './AnimationRitualSystem';

export { 
  RitualEasing,
  SacredEasing,
  EasingUtils,
  RitualEasingPresets,
  CSSEasingMap,
  EasingFunction
} from './easing-functions';

// 预定义的动画配置
export const ANIMATION_PRESETS = {
  // 入场动画预设
  ENTRANCE: {
    GENTLE: {
      style: EntranceStyle.FADE_IN,
      duration: 800,
      easing: 'ease-out'
    },
    BOUNCY: {
      style: EntranceStyle.SCALE_IN,
      duration: 600,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    },
    DRAMATIC: {
      style: EntranceStyle.DIVINE_DESCENT,
      duration: 1500,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)'
    },
    MYSTICAL: {
      style: EntranceStyle.SPIRAL_IN,
      duration: 1200,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },
  
  // 庆祝动画预设
  CELEBRATION: {
    COMMON: {
      particleCount: 8,
      duration: 1000,
      intensity: 'subtle'
    },
    RARE: {
      particleCount: 16,
      duration: 1500,
      intensity: 'moderate'
    },
    EPIC: {
      particleCount: 32,
      duration: 2000,
      intensity: 'dramatic'
    },
    LEGENDARY: {
      particleCount: 64,
      duration: 3000,
      intensity: 'epic'
    }
  },
  
  // 过渡动画预设
  TRANSITION: {
    QUICK: {
      duration: 300,
      easing: 'ease-out'
    },
    SMOOTH: {
      duration: 600,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    },
    DIVINE: {
      duration: 1200,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)'
    }
  },
  
  // 完成动画预设
  COMPLETION: {
    SIMPLE: {
      duration: 500,
      showParticles: false
    },
    SATISFYING: {
      duration: 800,
      showParticles: true,
      particleCount: 6
    },
    EPIC: {
      duration: 1200,
      showParticles: true,
      particleCount: 12,
      showGlow: true
    }
  }
} as const;

// 动画性能配置
export const PERFORMANCE_CONFIG = {
  // FPS阈值
  MIN_FPS: 30,
  TARGET_FPS: 60,
  
  // 内存使用阈值（MB）
  MAX_MEMORY_USAGE: 100,
  
  // 最大同时动画数量
  MAX_CONCURRENT_ANIMATIONS: 10,
  
  // 性能降级阈值
  PERFORMANCE_DEGRADATION_THRESHOLD: {
    fps: 45,
    frameDrops: 5,
    memoryUsage: 80
  }
} as const;

// 动画事件类型
export const ANIMATION_EVENTS = {
  START: 'ritualAnimationStart',
  COMPLETE: 'ritualAnimationComplete',
  CANCEL: 'ritualAnimationCancel',
  ERROR: 'ritualAnimationError',
  PERFORMANCE_WARNING: 'ritualAnimationPerformanceWarning'
} as const;
