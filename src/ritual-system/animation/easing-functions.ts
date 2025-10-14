/**
 * 仪式感动画缓动函数库
 * Sacred Easing Functions for Ritual Animations
 */

// 缓动函数类型
export type EasingFunction = (t: number) => number;

// 预定义的仪式感缓动函数
export const RitualEasing = {
  // 基础缓动
  linear: (t: number): number => t,
  
  // 入场仪式缓动 - 优雅进入
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  // 庆祝仪式缓动 - 弹性效果
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => (--t) * t * t + 1,
  easeInOutCubic: (t: number): number => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // 神圣缓动 - 平滑神圣感
  easeInQuart: (t: number): number => t * t * t * t,
  easeOutQuart: (t: number): number => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number): number => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  // 史诗缓动 - 戏剧性效果
  easeInQuint: (t: number): number => t * t * t * t * t,
  easeOutQuint: (t: number): number => 1 + (--t) * t * t * t * t,
  easeInOutQuint: (t: number): number => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
  
  // 正弦缓动 - 自然流动感
  easeInSine: (t: number): number => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: (t: number): number => Math.sin(t * Math.PI / 2),
  easeInOutSine: (t: number): number => (1 - Math.cos(Math.PI * t)) / 2,
  
  // 指数缓动 - 强烈冲击感
  easeInExpo: (t: number): number => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t: number): number => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number): number => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  
  // 圆形缓动 - 圆润过渡
  easeInCirc: (t: number): number => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t: number): number => Math.sqrt(1 - (t - 1) * (t - 1)),
  easeInOutCirc: (t: number): number => {
    if (t < 0.5) return (1 - Math.sqrt(1 - 4 * t * t)) / 2;
    return (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2;
  },
  
  // 回弹缓动 - 弹性回弹
  easeInBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    if (t < 0.5) {
      return (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2;
    }
    return (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  
  // 弹性缓动 - 弹簧效果
  easeInElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  easeOutElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeInOutElastic: (t: number): number => {
    const c5 = (2 * Math.PI) / 4.5;
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) {
      return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2;
    }
    return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  },
  
  // 反弹缓动 - 球体反弹
  easeInBounce: (t: number): number => 1 - RitualEasing.easeOutBounce(1 - t),
  easeOutBounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  easeInOutBounce: (t: number): number => {
    if (t < 0.5) {
      return (1 - RitualEasing.easeOutBounce(1 - 2 * t)) / 2;
    }
    return (1 + RitualEasing.easeOutBounce(2 * t - 1)) / 2;
  }
};

// 仪式感专用缓动函数
export const SacredEasing = {
  // 神圣降临 - 从天而降的神圣感
  divineDescend: (t: number): number => {
    return 1 - Math.pow(1 - t, 4) * Math.cos(t * Math.PI * 2);
  },
  
  // 金光闪现 - 金色光芒的闪烁效果
  goldenFlash: (t: number): number => {
    const flash = Math.sin(t * Math.PI * 8) * 0.1;
    return RitualEasing.easeOutQuart(t) + flash;
  },
  
  // 仪式脉冲 - 心跳般的脉冲节奏
  ritualPulse: (t: number): number => {
    const pulse = Math.sin(t * Math.PI * 4) * 0.05 * (1 - t);
    return RitualEasing.easeInOutSine(t) + pulse;
  },
  
  // 神秘螺旋 - 螺旋上升的神秘感
  mysticSpiral: (t: number): number => {
    const spiral = Math.sin(t * Math.PI * 6) * 0.1 * (1 - t);
    return RitualEasing.easeOutBack(t) + spiral;
  },
  
  // 庆祝爆发 - 庆祝时的爆发效果
  celebrationBurst: (t: number): number => {
    if (t < 0.1) return RitualEasing.easeOutElastic(t * 10);
    if (t < 0.9) return 1;
    return 1 - RitualEasing.easeInQuart((t - 0.9) * 10);
  },
  
  // 优雅淡入 - 优雅的淡入效果
  elegantFadeIn: (t: number): number => {
    return Math.sin(t * Math.PI / 2) * RitualEasing.easeOutCubic(t);
  },
  
  // 史诗展开 - 史诗级的展开效果
  epicUnfold: (t: number): number => {
    const unfold = 1 - Math.pow(1 - t, 5);
    const shimmer = Math.sin(t * Math.PI * 3) * 0.05 * t;
    return unfold + shimmer;
  },
  
  // 神圣共鸣 - 神圣的共鸣效果
  sacredResonance: (t: number): number => {
    const resonance = Math.sin(t * Math.PI * 2) * 0.1 * Math.sin(t * Math.PI);
    return RitualEasing.easeInOutSine(t) + resonance;
  }
};

// 缓动函数工具类
export class EasingUtils {
  /**
   * 创建自定义贝塞尔缓动函数
   */
  static createBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
    return (t: number): number => {
      // 简化的贝塞尔曲线实现
      const cx = 3 * x1;
      const bx = 3 * (x2 - x1) - cx;
      const ax = 1 - cx - bx;
      
      const cy = 3 * y1;
      const by = 3 * (y2 - y1) - cy;
      const ay = 1 - cy - by;
      
      const sampleCurveX = (t: number): number => ((ax * t + bx) * t + cx) * t;
      const sampleCurveY = (t: number): number => ((ay * t + by) * t + cy) * t;
      
      // 使用牛顿法求解
      let x = t;
      for (let i = 0; i < 8; i++) {
        const currentX = sampleCurveX(x) - t;
        if (Math.abs(currentX) < 0.000001) break;
        const currentSlope = (3 * ax * x + 2 * bx) * x + cx;
        if (Math.abs(currentSlope) < 0.000001) break;
        x -= currentX / currentSlope;
      }
      
      return sampleCurveY(x);
    };
  }
  
  /**
   * 组合多个缓动函数
   */
  static combine(easings: EasingFunction[], weights?: number[]): EasingFunction {
    const normalizedWeights = weights || easings.map(() => 1 / easings.length);
    const totalWeight = normalizedWeights.reduce((sum, weight) => sum + weight, 0);
    
    return (t: number): number => {
      return easings.reduce((result, easing, index) => {
        const weight = normalizedWeights[index] / totalWeight;
        return result + easing(t) * weight;
      }, 0);
    };
  }
  
  /**
   * 创建分段缓动函数
   */
  static createSegmented(segments: Array<{ duration: number; easing: EasingFunction }>): EasingFunction {
    const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);
    
    return (t: number): number => {
      const scaledT = t * totalDuration;
      let currentTime = 0;
      
      for (const segment of segments) {
        if (scaledT <= currentTime + segment.duration) {
          const segmentT = (scaledT - currentTime) / segment.duration;
          return segment.easing(segmentT);
        }
        currentTime += segment.duration;
      }
      
      return 1; // 如果超出范围，返回1
    };
  }
  
  /**
   * 创建延迟缓动函数
   */
  static createDelayed(easing: EasingFunction, delay: number): EasingFunction {
    return (t: number): number => {
      if (t < delay) return 0;
      return easing((t - delay) / (1 - delay));
    };
  }
  
  /**
   * 创建重复缓动函数
   */
  static createRepeated(easing: EasingFunction, repetitions: number): EasingFunction {
    return (t: number): number => {
      const scaledT = (t * repetitions) % 1;
      return easing(scaledT);
    };
  }
  
  /**
   * 创建反向缓动函数
   */
  static createReversed(easing: EasingFunction): EasingFunction {
    return (t: number): number => 1 - easing(1 - t);
  }
  
  /**
   * 创建镜像缓动函数（先正向再反向）
   */
  static createMirrored(easing: EasingFunction): EasingFunction {
    return (t: number): number => {
      if (t < 0.5) {
        return easing(t * 2);
      } else {
        return easing(2 - t * 2);
      }
    };
  }
}

// 预定义的仪式感缓动组合
export const RitualEasingPresets = {
  // 欢迎仪式 - 温和优雅的进入
  welcome: SacredEasing.elegantFadeIn,
  
  // 成就庆祝 - 爆发式的庆祝效果
  achievement: SacredEasing.celebrationBurst,
  
  // 创作启发 - 神秘的螺旋上升
  creation: SacredEasing.mysticSpiral,
  
  // 分享传播 - 脉冲式的传播效果
  sharing: SacredEasing.ritualPulse,
  
  // 里程碑 - 史诗级的展开
  milestone: SacredEasing.epicUnfold,
  
  // 过渡转换 - 神圣的共鸣过渡
  transition: SacredEasing.sacredResonance,
  
  // 神圣降临 - 从天而降
  divine: SacredEasing.divineDescend,
  
  // 金光闪现 - 金色光芒
  golden: SacredEasing.goldenFlash
};

// CSS缓动函数映射
export const CSSEasingMap = {
  [RitualEasing.easeInQuad.name]: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  [RitualEasing.easeOutQuad.name]: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  [RitualEasing.easeInOutQuad.name]: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  [RitualEasing.easeInCubic.name]: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  [RitualEasing.easeOutCubic.name]: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  [RitualEasing.easeInOutCubic.name]: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  [RitualEasing.easeInBack.name]: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
  [RitualEasing.easeOutBack.name]: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  [RitualEasing.easeInOutBack.name]: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
};

// 导出默认缓动函数
export default RitualEasing;