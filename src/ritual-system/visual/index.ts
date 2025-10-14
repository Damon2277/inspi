/**
 * 视觉仪式感系统导出
 */

export { 
  VisualRitualOrchestrator, 
  VisualScene, 
  VisualElement, 
  RitualStyle 
} from './VisualRitualOrchestrator';

// 导出样式表路径常量
export const RITUAL_STYLESHEETS = {
  COLORS: '/src/ritual-system/visual/colors.css',
  TYPOGRAPHY: '/src/ritual-system/visual/typography.css',
  DECORATIVE_ELEMENTS: '/src/ritual-system/visual/decorative-elements.css'
} as const;

// 导出预定义的仪式感样式配置
export const RITUAL_STYLE_PRESETS = {
  WELCOME_GOLD: {
    colorTheme: 'gold' as const,
    intensity: 3,
    decorativeLevel: 'ornate' as const
  },
  ACHIEVEMENT_PURPLE: {
    colorTheme: 'purple' as const,
    intensity: 2,
    decorativeLevel: 'moderate' as const
  },
  MILESTONE_DIVINE: {
    colorTheme: 'divine' as const,
    intensity: 4,
    decorativeLevel: 'epic' as const
  },
  CREATION_BLUE: {
    colorTheme: 'blue' as const,
    intensity: 2,
    decorativeLevel: 'moderate' as const
  },
  SHARING_CELESTIAL: {
    colorTheme: 'divine' as const,
    intensity: 3,
    decorativeLevel: 'ornate' as const
  },
  TRANSITION_SUBTLE: {
    colorTheme: 'gold' as const,
    intensity: 1,
    decorativeLevel: 'minimal' as const
  }
} as const;